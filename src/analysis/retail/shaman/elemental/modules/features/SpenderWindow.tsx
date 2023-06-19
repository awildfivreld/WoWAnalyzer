import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/shaman';
import { formatDuration } from 'common/format';
import { SpellIcon, SpellLink, TooltipElement } from 'interface';
import { explanationAndDataSubsection } from 'interface/guide/components/ExplanationRow';
import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import Events, { CastEvent, FightEndEvent } from 'parser/core/Events';
import Enemies from 'parser/shared/modules/Enemies';

type SpenderWindowType = {
  timestamp: number;
  motePresent: boolean;
  elshocksPresent?: boolean;
  sopUse?: CastEvent;
};

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

  protected enemies!: Enemies;

  sopDebounce: number;

  spenderWindows: SpenderWindowType[];

  constructor(options: Options) {
    super(options);

    this.spenderWindows = [];
    this.sopDebounce = 0;

    this.addEventListener(
      Events.cast.by(SELECTED_PLAYER).spell(TALENTS.ELEMENTAL_BLAST_TALENT),
      this.onEB,
    );
    this.addEventListener(Events.cast.by(SELECTED_PLAYER).spell(SOP_SPENDERS), this.onSopSpender);
    this.addEventListener(Events.fightend, this.onFightEnd);
  }

  onFightEnd(event: FightEndEvent) {
    if (this.spenderWindows[this.spenderWindows.length - 1].sopUse === undefined) {
      // Skip the last (unfinished) window, as it was not completed.
      this.spenderWindows.pop();
    }
  }

  onEB(event: CastEvent) {
    this.spenderWindows.push({
      timestamp: event.timestamp,
      motePresent: this.selectedCombatant.hasBuff(SPELLS.MASTER_OF_THE_ELEMENTS_BUFF.id, null, 100), // EB seems to consume MotE before its CastEvent, so a little buffer is required.
    });
  }

  onSopSpender(event: CastEvent) {
    // There are bugs in the logs where the removebuff and cast events do not have the same timestamp, adding 100 as buffer seems to fix this.
    if (!this.selectedCombatant.hasBuff(SPELLS.SURGE_OF_POWER_BUFF.id, null, 100)) {
      return;
    }
    // It can happen that an LB and FrS cast have the same timestamp, and therefore trigger this listener before the removebuff event is processed.
    if (event.timestamp === this.sopDebounce) {
      return;
    }
    this.sopDebounce = event.timestamp;

    const sw = this.spenderWindows[this.spenderWindows.length - 1];
    sw.elshocksPresent =
      this.enemies
        .getEntity(event)
        ?.hasBuff(TALENTS.ELECTRIFIED_SHOCKS_TALENT.id, event.timestamp) || false;
    sw.sopUse = event;
  }

  get guideSubsection() {
    const explanation = (
      <>
        When you cast your single target spender (
        <SpellLink spell={TALENTS.ELEMENTAL_BLAST_TALENT} />
        ), you want to empower it with
        <SpellLink spell={TALENTS.MASTER_OF_THE_ELEMENTS_TALENT} /> first, then use the{' '}
        <SpellLink spell={TALENTS.SURGE_OF_POWER_TALENT} /> on something useful (mostly{' '}
        <SpellLink spell={SPELLS.LIGHTNING_BOLT} /> or{' '}
        <SpellLink spell={TALENTS.CHAIN_LIGHTNING_TALENT} />
        ). This mini rotation is called a "spender window".
      </>
    );

    const perfectSpenderWindows = this.spenderWindows.filter(
      (w) =>
        w.motePresent &&
        w.elshocksPresent &&
        GOOD_SOP_SPENDERS.includes(w.sopUse?.ability.guid || 0),
    );
    const spenderWindowsMissingMote = this.spenderWindows.filter((w) => !w.motePresent);
    const spenderWindowsMissingElshocks = this.spenderWindows.filter((w) => !w.elshocksPresent);
    const spenderWindowsWrongSop = this.spenderWindows.filter(
      (w) => !GOOD_SOP_SPENDERS.includes(w.sopUse?.ability.guid || 0),
    );

    const windowTimestamps = (windows: SpenderWindowType[]) => {
      return windows
        .map((w) => formatDuration(w.timestamp - this.owner.fight.start_time))
        .join(', ');
    };

    const renderRow = (label: JSX.Element, subWindows: SpenderWindowType[]) => {
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
        {renderRow(
          <>
            Elemental Blast missing <SpellLink spell={TALENTS.MASTER_OF_THE_ELEMENTS_TALENT} />
          </>,
          spenderWindowsMissingMote,
        )}
        <br />
        {renderRow(
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
