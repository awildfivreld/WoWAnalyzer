import { formatDuration } from 'common/format';
import TALENTS from 'common/TALENTS/shaman';
import RESOURCE_TYPES from 'game/RESOURCE_TYPES';
import { ResourceLink, SpellLink } from 'interface';
import { explanationAndDataSubsection } from 'interface/guide/components/ExplanationRow';
import GradiatedPerformanceBar from 'interface/guide/components/GradiatedPerformanceBar';
import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import Events, { ApplyBuffEvent, RefreshBuffEvent, RemoveBuffEvent } from 'parser/core/Events';
import { ThresholdStyle, When } from 'parser/core/ParseResults';
import AbilityTracker from 'parser/shared/modules/AbilityTracker';
import Enemies from 'parser/shared/modules/Enemies';

interface EmpoweredFSCastWindow {
  start: number;
  end: number;
  empoweredCasts: number;
}

class Icefury extends Analyzer {
  static dependencies = {
    abilityTracker: AbilityTracker,
    enemies: Enemies,
  };
  activeFSWindow: EmpoweredFSCastWindow | null;
  icefuryWindows: EmpoweredFSCastWindow[] = [];
  protected abilityTracker!: AbilityTracker;
  protected enemies!: Enemies;

  constructor(options: Options) {
    super(options);
    this.active = this.selectedCombatant.hasTalent(TALENTS.ICEFURY_TALENT);

    this.activeFSWindow = null;

    if (!this.active) {
      return;
    }

    this.addEventListener(
      Events.cast.by(SELECTED_PLAYER).spell(TALENTS.FROST_SHOCK_TALENT),
      this.onFrostShockCast,
    );

    this.addEventListener(
      Events.applybuff.by(SELECTED_PLAYER).spell(TALENTS.ICEFURY_TALENT),
      this.onIcefuryBuff,
    );

    this.addEventListener(
      Events.applybuff.by(SELECTED_PLAYER).spell(TALENTS.ICEFURY_TALENT),
      this.onIcefuryBuff,
    );

    this.addEventListener(
      Events.removebuff.by(SELECTED_PLAYER).spell(TALENTS.ICEFURY_TALENT),
      this.onIcefuryBuffDropoff,
    );
  }

  onIcefuryBuff(event: ApplyBuffEvent) {
    this.activeFSWindow = { start: event.timestamp, end: -1, empoweredCasts: 0 };
  }

  onIcefuryRefresh(event: RefreshBuffEvent) {
    if (!this.activeFSWindow) {
      return;
    }
    this.activeFSWindow.end = event.timestamp;
    this.icefuryWindows.push(this.activeFSWindow);

    this.activeFSWindow = { start: event.timestamp, end: -1, empoweredCasts: 0 };
  }

  onIcefuryBuffDropoff(event: RemoveBuffEvent) {
    if (!this.activeFSWindow) {
      return;
    }

    this.activeFSWindow.end = event.timestamp;
    this.icefuryWindows.push(this.activeFSWindow);
    this.activeFSWindow = null;
  }
  onFrostShockCast() {
    if (!this.activeFSWindow) {
      return;
    }

    this.activeFSWindow.empoweredCasts += 1;
  }

  get empoweredFrostShockCasts() {
    return this.icefuryWindows.map((e) => e.empoweredCasts).reduce((a, b) => a + b, 0);
  }

  get suggestionThresholds() {
    return {
      actual:
        this.empoweredFrostShockCasts /
        this.abilityTracker.getAbility(TALENTS.ICEFURY_TALENT.id).casts,
      isLessThan: {
        minor: 4,
        average: 3.5,
        major: 3,
      },
      style: ThresholdStyle.DECIMAL,
    };
  }

  get guideSubsection() {
    const description = (
      <>
        <strong>Icefury</strong> - <SpellLink id={TALENTS.ICEFURY_TALENT} /> makes our frost shocks
        deal a lot more damage and generate quite a bit of{' '}
        <ResourceLink id={RESOURCE_TYPES.MAELSTROM.id} />. You should aim to use all four stacks
        that casting Icefury gives you, before they drop off.
      </>
    );

    console.log(this.icefuryWindows);

    const icefuryWindowPerformances = {
      perfect: { count: 0, label: 'Used all 4 stacks @ ' },
      ok: { count: 0, label: 'Used 3 of 4 available stacks @ ' },
      bad: { count: 0, label: 'Used < 3 available stacks @ ' },
    };
    this.icefuryWindows.forEach((w) => {
      let perf;
      if (w.empoweredCasts < 3) {
        perf = icefuryWindowPerformances.bad;
      } else if (w.empoweredCasts === 3) {
        perf = icefuryWindowPerformances.ok;
      } else {
        perf = icefuryWindowPerformances.perfect;
      }

      perf.count += 1;
      // Yes this is leaves a trailing comma, don't want to spend time on prettying this for now.
      perf.label += formatDuration(w.start - this.owner.fight.start_time) + ', ';
    });

    const data = (
      <div>
        <span>
          <SpellLink id={TALENTS.ICEFURY_TALENT} /> window performance -{' '}
          <small>How many Frost Shock stacks used on each Icefury cast.</small>
        </span>
        <GradiatedPerformanceBar {...icefuryWindowPerformances} />
      </div>
    );

    return explanationAndDataSubsection(description, data);
  }

  suggestions(when: When) {
    when(this.suggestionThresholds).addSuggestion((suggest, actual) =>
      suggest(
        <>
          You should fully utilize your <SpellLink id={TALENTS.ICEFURY_TALENT.id} /> casts by
          casting 4 <SpellLink id={TALENTS.FROST_SHOCK_TALENT.id} />s before the{' '}
          <SpellLink id={TALENTS.ICEFURY_TALENT.id} /> buff expires. Pay attention to the remaining
          duration of the buff to ensure you have time to use all of the stacks.
        </>,
      )
        .icon(TALENTS.ICEFURY_TALENT.icon)
        .actual(
          <>
            On average, only {actual.toFixed(2)} <SpellLink id={TALENTS.ICEFURY_TALENT.id} />
            (s) stacks were consumed with <SpellLink id={TALENTS.FROST_SHOCK_TALENT.id} /> casts
            before <SpellLink id={TALENTS.ICEFURY_TALENT.id} /> buff expired.
          </>,
        )
        .recommended("It's recommended to always consume all 4 stacks."),
    );
  }
}

export default Icefury;
