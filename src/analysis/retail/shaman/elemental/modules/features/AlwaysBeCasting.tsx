import PerformancePercentage from 'analysis/retail/demonhunter/shared/guide/PerformancePercentage';
import { formatPercentage } from 'common/format';
import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/shaman';
import { Expandable, SpellLink } from 'interface';
import { SectionHeader, SubSection } from 'interface/guide';
import { ThresholdStyle, When } from 'parser/core/ParseResults';
import { AlwaysBeCastingGraph } from 'parser/shared/modules/AlwaysBeCasting';
import { determinePerformance } from '../common/determinePerformance';

class AlwaysBeCasting extends AlwaysBeCastingGraph {
  get suggestionThresholds() {
    return {
      actual: this.activeTimePercentage,
      isLessThan: {
        minor: 0.95,
        average: 0.85,
        major: 0.75,
      },
      style: ThresholdStyle.PERCENTAGE,
    };
  }

  get guideSubsection() {
    const abcPerformance = determinePerformance(this.activeTimePercentage, {
      perfectPct: this.suggestionThresholds.isLessThan.minor,
      goodPct: this.suggestionThresholds.isLessThan.average,
      okPct: this.suggestionThresholds.isLessThan.major,
    });
    return (
      <SubSection title="Always be casting">
        It is important to be casting as many abilities as you can. Any prolonged period of time not
        spent casting is lost dps. You spent in total{' '}
        <PerformancePercentage
          performance={abcPerformance}
          percentage={this.activeTimePercentage}
          perfectPercentage={this.suggestionThresholds.isLessThan.minor}
          goodPercentage={this.suggestionThresholds.isLessThan.average}
          okPercentage={this.suggestionThresholds.isLessThan.major}
        />{' '}
        of the fight duration in global cooldown.
        <br />
        <br />
        If you have to move, try to use utility spells like{' '}
        <SpellLink spell={TALENTS.SPIRITWALKERS_GRACE_TALENT} /> to cast while moving, move faster
        to your destination with <SpellLink spell={SPELLS.GHOST_WOLF} /> or use instant cast spells
        while moving. During a fight there will always be an optimal position you should stand in to
        handle current or upcoming mechanics. The Elemental shaman rotation naturally has some
        spells that are instant cast, such as <SpellLink spell={TALENTS.FROST_SHOCK_TALENT} />,{' '}
        <SpellLink spell={TALENTS.NATURES_SWIFTNESS_TALENT} /> empowered{' '}
        <SpellLink spell={TALENTS.ELEMENTAL_BLAST_TALENT} /> or Stormkeeper buffed{' '}
        <SpellLink spell={SPELLS.LIGHTNING_BOLT} />. You should try to move slightly during each of
        these GCD's towards the optimal position, so you have to move less without casting later.
        <br />
        <br />
        <Expandable
          header={
            <SectionHeader>
              <strong>Graph</strong>
            </SectionHeader>
          }
          element="section"
        >
          <small>
            Graph showing how much time in % you spent in global cooldown as the fight progressed.
            The start of the fight will be a bit erradic, so focus on 30-40s+
          </small>
          {this.plot}
        </Expandable>
      </SubSection>
    );
  }
  suggestions(when: When) {
    when(this.suggestionThresholds).addSuggestion((suggest, actual, recommended) =>
      suggest(
        <>
          Your downtime can be improved. If you need to move use{' '}
          <SpellLink id={SPELLS.FLAME_SHOCK.id} />, <SpellLink id={TALENTS.EARTH_SHOCK_TALENT.id} />{' '}
          or <SpellLink id={TALENTS.FROST_SHOCK_TALENT.id} />
        </>,
      )
        .icon('spell_mage_altertime')
        .actual(`${formatPercentage(1 - actual)}% downtime`)
        .recommended(`<${formatPercentage(1 - recommended)}% is recommended`),
    );
  }
}

export default AlwaysBeCasting;
