import { formatDuration } from 'common/format';
import TALENTS from 'common/TALENTS/shaman';
import { Expandable, SpellLink } from 'interface';
import { PerformanceMark, SectionHeader } from 'interface/guide';
import CooldownExpandable, {
  CooldownExpandableItem,
} from 'interface/guide/components/CooldownExpandable';
import { explanationAndDataSubsection } from 'interface/guide/components/ExplanationRow';
import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import Events, { ApplyBuffEvent, RefreshBuffEvent, RemoveBuffEvent } from 'parser/core/Events';
import { ThresholdStyle, When } from 'parser/core/ParseResults';
import AbilityTracker from 'parser/shared/modules/AbilityTracker';
import Enemies from 'parser/shared/modules/Enemies';
import SpellUsable from 'parser/shared/modules/SpellUsable';
import { getLowestPerf, QualitativePerformance } from 'parser/ui/QualitativePerformance';

interface ActiveIFWindow {
  start: number;
  empoweredCasts: number;
}

interface FinishedIFWindow extends ActiveIFWindow {
  end: number;
  icefuryCooldownLeft: number;
}

class Icefury extends Analyzer {
  static dependencies = {
    abilityTracker: AbilityTracker,
    spellUsable: SpellUsable,
    enemies: Enemies,
  };
  activeIFWindow: ActiveIFWindow | null;
  icefuryWindows: FinishedIFWindow[] = [];

  protected spellUsable!: SpellUsable;
  protected abilityTracker!: AbilityTracker;
  protected enemies!: Enemies;

  constructor(options: Options) {
    super(options);
    this.active = this.selectedCombatant.hasTalent(TALENTS.ICEFURY_TALENT);

    this.activeIFWindow = null;

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
      Events.removebuff.by(SELECTED_PLAYER).spell(TALENTS.ICEFURY_TALENT),
      this.onIcefuryBuffDropoff,
    );
  }

  onIcefuryBuff(event: ApplyBuffEvent) {
    this.activeIFWindow = { start: event.timestamp, empoweredCasts: 0 };
  }

  onIcefuryRefresh(event: RefreshBuffEvent) {
    if (!this.activeIFWindow) {
      return;
    }
    this.icefuryWindows.push({
      ...this.activeIFWindow,
      end: event.timestamp,
      icefuryCooldownLeft: 0,
    });

    this.activeIFWindow = { start: event.timestamp, empoweredCasts: 0 };
  }

  onIcefuryBuffDropoff(event: RemoveBuffEvent) {
    if (!this.activeIFWindow) {
      return;
    }

    this.icefuryWindows.push({
      ...this.activeIFWindow,
      end: event.timestamp,
      icefuryCooldownLeft: Math.max(
        this.spellUsable.cooldownRemaining(TALENTS.ICEFURY_TALENT.id) - 9000,
        0,
      ),
    });
    this.activeIFWindow = null;
  }
  onFrostShockCast() {
    if (!this.activeIFWindow) {
      return;
    }

    this.activeIFWindow.empoweredCasts += 1;
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
        <strong>Icefury</strong> - The most important effect of{' '}
        <SpellLink spell={TALENTS.ICEFURY_TALENT} /> is that it applies{' '}
        <SpellLink spell={TALENTS.ELECTRIFIED_SHOCKS_TALENT} /> to up to four targets when you cast{' '}
        <SpellLink spell={TALENTS.FROST_SHOCK_TALENT} />. Therefore, you should try to use all four
        of stacks of <SpellLink spell={TALENTS.ICEFURY_TALENT} /> every time, while also spreading
        them out so that <SpellLink spell={TALENTS.ELECTRIFIED_SHOCKS_TALENT} /> is up continously.
      </>
    );

    const icefuryWindowPerformances = {
      perfect: { count: 0, label: 'Used all 4 stacks @ ' },
      ok: { count: 0, label: 'Used 3 of 4 available stacks @ ' },
      bad: { count: 0, label: 'Used < 3 available stacks @ ' },
    };
    this.icefuryWindows.forEach((w) => {
      let perf;
      /* Find out which icefuryWindowPerformance this window belongs to */
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

    const casts = this.icefuryWindows.map((ifw) => {
      const header = (
        <>
          @ {this.owner.formatTimestamp(ifw.start)} &mdash;{' '}
          <SpellLink spell={TALENTS.ICEFURY_TALENT} />
        </>
      );

      let fsCastPerf = QualitativePerformance.Fail;
      if (ifw.empoweredCasts === 4) {
        fsCastPerf = QualitativePerformance.Perfect;
      } else if (ifw.empoweredCasts === 3) {
        fsCastPerf = QualitativePerformance.Ok;
      }

      const fsCastChecklistItem: CooldownExpandableItem = {
        label: <>Frost shock casts</>,
        result: (
          <>
            <PerformanceMark perf={fsCastPerf} />
          </>
        ),
        details: <>{ifw.empoweredCasts} / 4 stacks used</>,
      };

      let fsSpreadPerf = QualitativePerformance.Fail;
      if (ifw.icefuryCooldownLeft <= 1000) {
        fsSpreadPerf = QualitativePerformance.Perfect;
      } else if (ifw.icefuryCooldownLeft < 5000) {
        fsSpreadPerf = QualitativePerformance.Good;
      } else if (ifw.icefuryCooldownLeft < 9000) {
        fsSpreadPerf = QualitativePerformance.Ok;
      }

      const fsSpreadChecklistItem: CooldownExpandableItem = {
        label: (
          <>
            Duration left on <SpellLink spell={TALENTS.ICEFURY_TALENT} /> cooldown
          </>
        ),
        result: (
          <>
            <PerformanceMark perf={fsSpreadPerf} />
          </>
        ),
        details: <>{formatDuration(ifw.icefuryCooldownLeft)}</>,
      };

      return {
        _key: 'icefury-' + ifw.start,
        header: header,
        perf: getLowestPerf([fsCastPerf, fsSpreadPerf]),
        checklistItems: [fsCastChecklistItem, fsSpreadChecklistItem],
      };
    });

    const imperfectWindows = casts
      .filter((c) => c.perf !== QualitativePerformance.Perfect)
      .map((c) => <CooldownExpandable key={c._key} {...c} />);
    const perfectWindows = casts
      .filter((c) => c.perf === QualitativePerformance.Perfect)
      .map((c) => <CooldownExpandable key={c._key} {...c} />);

    const data = (
      <div>
        <strong>Cast breakdown</strong> -{' '}
        <small>Breakdown of how well you used each Icefury window.</small>
        {imperfectWindows}
        <br />
        <Expandable
          header={
            <SectionHeader>
              {' '}
              <PerformanceMark perf={QualitativePerformance.Perfect} /> Perfect windows -{' '}
              {perfectWindows.length}
            </SectionHeader>
          }
          element="section"
        >
          {perfectWindows}
        </Expandable>
      </div>
    );

    return explanationAndDataSubsection(description, data);
  }

  suggestions(when: When) {
    when(this.suggestionThresholds).addSuggestion((suggest, actual) =>
      suggest(
        <>
          You should fully utilize your <SpellLink spell={TALENTS.ICEFURY_TALENT.id} /> casts by
          casting 4 <SpellLink spell={TALENTS.FROST_SHOCK_TALENT.id} />s before the{' '}
          <SpellLink spell={TALENTS.ICEFURY_TALENT.id} /> buff expires.Pay attention to the
          remaining duration of the buff to ensure you have time to use all of the stacks.
        </>,
      )
        .icon(TALENTS.ICEFURY_TALENT.icon)
        .actual(
          <>
            On average, only {actual.toFixed(2)} <SpellLink spell={TALENTS.ICEFURY_TALENT.id} />
            (s) stacks were consumed with <SpellLink spell={TALENTS.FROST_SHOCK_TALENT.id} /> casts
            before <SpellLink spell={TALENTS.ICEFURY_TALENT.id} /> buff expired.
          </>,
        )
        .recommended("It's recommended to always consume all 4 stacks."),
    );
  }
}

export default Icefury;
