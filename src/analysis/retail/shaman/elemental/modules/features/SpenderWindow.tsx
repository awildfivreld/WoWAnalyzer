import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/shaman';
import { Talent } from 'common/TALENTS/types';
import { formatDuration } from 'common/format';
import { SpellIcon, SpellLink, TooltipElement } from 'interface';
import { explanationAndDataSubsection } from 'interface/guide/components/ExplanationRow';
import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import Events, { CastEvent } from 'parser/core/Events';
import Enemies from 'parser/shared/modules/Enemies';

interface ActiveSpenderWindow {
  timestamp: number;
  motePresent: boolean;
}

interface FinishedSpenderWindow extends ActiveSpenderWindow {
  elshocksPresent: boolean;
  sopUse: CastEvent;
}

const SOP_SPENDERS = [
  SPELLS.LIGHTNING_BOLT,
  TALENTS.CHAIN_LIGHTNING_TALENT,
  SPELLS.FLAME_SHOCK,
  TALENTS.FROST_SHOCK_TALENT,
  TALENTS.LAVA_BURST_TALENT,
];

const GOOD_SOP_SPENDERS = [
  SPELLS.LIGHTNING_BOLT.id,
  TALENTS.CHAIN_LIGHTNING_TALENT.id,
  SPELLS.FLAME_SHOCK.id,
];

class SpenderWindow extends Analyzer {
  static dependencies = {
    enemies: Enemies,
  };

  enabled: boolean = true;

  protected enemies!: Enemies;

  sopDebounceTs: number;

  activeSpenderWindow: ActiveSpenderWindow | null;
  spenderWindows: FinishedSpenderWindow[];

  _stSpender: Talent = TALENTS.EARTH_SHOCK_TALENT;

  constructor(options: Options) {
    super(options);

    this.activeSpenderWindow = null;
    this.spenderWindows = [];
    this.sopDebounceTs = 0;

    if (!this.selectedCombatant.hasTalent(TALENTS.SURGE_OF_POWER_TALENT)) {
      /* There is no point in tracking this at all if the player doesn't have SoP */
      this.enabled = false;
      return;
    }

    if (this.selectedCombatant.hasTalent(TALENTS.ELEMENTAL_BLAST_TALENT)) {
      this._stSpender = TALENTS.ELEMENTAL_BLAST_TALENT;
    }

    this.addEventListener(Events.cast.by(SELECTED_PLAYER).spell(this._stSpender), this.onSpender);
    this.addEventListener(Events.cast.by(SELECTED_PLAYER).spell(SOP_SPENDERS), this.onSopSpender);
  }

  onSpender(event: CastEvent) {
    if (this.activeSpenderWindow) {
      /* TODO: Log that the user cast two spenders in a row */
      return;
    }

    this.activeSpenderWindow = {
      timestamp: event.timestamp,
      motePresent: this.selectedCombatant.hasBuff(SPELLS.MASTER_OF_THE_ELEMENTS_BUFF.id, null, 100), // EB seems to consume MotE before its CastEvent, so a little buffer is required.
    };
  }

  onSopSpender(event: CastEvent) {
    // There are bugs in the logs where the removebuff and cast events do not have the same timestamp, adding 100 as buffer seems to fix this.
    if (!this.activeSpenderWindow) {
      return;
    }
    if (!this.selectedCombatant.hasBuff(SPELLS.SURGE_OF_POWER_BUFF.id, null, 100)) {
      return;
    }
    // It can happen that an LB and FrS cast have the same timestamp, and therefore trigger this listener before the removebuff event is processed.
    if (event.timestamp === this.sopDebounceTs) {
      return;
    }
    this.sopDebounceTs = event.timestamp;

    const elshocksPresent =
      this.enemies
        .getEntity(event)
        ?.hasBuff(TALENTS.ELECTRIFIED_SHOCKS_TALENT.id, event.timestamp) || false;

    this.spenderWindows.push({ ...this.activeSpenderWindow, elshocksPresent, sopUse: event });
  }

  get guideSubsection() {
    if (!this.enabled) {
      return <></>;
    }

    const explanation = (
      <>
        When you cast your single target spender (
        <SpellLink spell={this._stSpender} />
        ), you want to empower it with as much of your other talents as you can. This mini rotation
        is called a "spender window".
      </>
    );

    const perfectSpenderWindows = this.spenderWindows.filter(
      (w) =>
        (w.motePresent ||
          !this.selectedCombatant.hasTalent(TALENTS.MASTER_OF_THE_ELEMENTS_TALENT)) &&
        (w.elshocksPresent ||
          !this.selectedCombatant.hasTalent(TALENTS.ELECTRIFIED_SHOCKS_TALENT)) &&
        GOOD_SOP_SPENDERS.includes(w.sopUse?.ability.guid || 0),
    );
    const spenderWindowsMissingMote = this.spenderWindows.filter((w) => !w.motePresent);
    const spenderWindowsMissingElshocks = this.spenderWindows.filter((w) => !w.elshocksPresent);
    const spenderWindowsWrongSop = this.spenderWindows.filter(
      (w) => !GOOD_SOP_SPENDERS.includes(w.sopUse?.ability.guid || 0),
    );

    const windowTimestamps = (windows: FinishedSpenderWindow[]) => {
      return windows
        .map((w) => formatDuration(w.timestamp - this.owner.fight.start_time))
        .join(', ');
    };

    const renderRow = (label: JSX.Element, subWindows: FinishedSpenderWindow[]) => {
      const windowsPct = subWindows.length / this.spenderWindows.length;
      return (
        <>
          {label}:{' '}
          <TooltipElement content={'@ ' + windowTimestamps(subWindows)}>
            <strong>
              {subWindows.length} ({(windowsPct * 100).toFixed(0)}%)
            </strong>
          </TooltipElement>
        </>
      );
    };

    const data = (
      <div>
        {renderRow(<>Perfect spender windows</>, perfectSpenderWindows)}
        <br />
        <br />
        <strong> Imperfect window breakdown</strong> -{' '}
        <small>Note one window might be included multiple times below.</small>
        <br />
        Wrong <SpellLink spell={TALENTS.SURGE_OF_POWER_TALENT} /> usage:{' '}
        <TooltipElement
          content={
            <>
              @{' '}
              {spenderWindowsWrongSop.map((w) => (
                <>
                  {formatDuration(w.timestamp - this.owner.fight.start_time)}
                  <SpellIcon spell={w.sopUse?.ability.guid || 0} />,{' '}
                </>
              ))}
            </>
          }
        >
          <strong>
            {spenderWindowsWrongSop.length} (
            {((spenderWindowsWrongSop.length / this.spenderWindows.length) * 100).toFixed(0)}%)
          </strong>
        </TooltipElement>
        <br />
        {this.selectedCombatant.hasTalent(TALENTS.MASTER_OF_THE_ELEMENTS_TALENT) &&
          renderRow(
            <>
              Elemental Blast missing <SpellLink spell={TALENTS.MASTER_OF_THE_ELEMENTS_TALENT} />
            </>,
            spenderWindowsMissingMote,
          )}
        <br />
        {this.selectedCombatant.hasTalent(TALENTS.ELECTRIFIED_SHOCKS_TALENT) &&
          renderRow(
            <>
              <SpellLink spell={TALENTS.SURGE_OF_POWER_TALENT} /> spell missing{' '}
              <SpellLink spell={TALENTS.ELECTRIFIED_SHOCKS_TALENT} />
            </>,
            spenderWindowsMissingElshocks,
          )}
        <br />
      </div>
    );

    return explanationAndDataSubsection(explanation, data);
  }
}

export default SpenderWindow;
