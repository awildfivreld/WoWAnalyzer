import TALENTS from 'common/TALENTS/shaman';
import { GuideProps, Section, SectionHeader, SubSection } from 'interface/guide';
import CombatLogParser from './CombatLogParser';
import CoreRotationSection from './modules/guide/CoreRotationSection';
import UtilityAndOthersSections from './modules/core/UtilityAndOthersSection';
import PreparationSection from 'interface/guide/components/Preparation/PreparationSection';
import GenericCooldownGraphSubsection from './modules/guide/GenericCooldownGraphSubsection';
import { determinePerformance } from './modules/common/determinePerformance';
import { Expandable } from 'interface';
import PerformancePercentage from 'analysis/retail/demonhunter/shared/guide/PerformancePercentage';

function ResourceSubsection({ modules, events, info }: GuideProps<typeof CombatLogParser>) {
  const wastedThresholds = modules.maelstromDetails.suggestionThresholdsWasted;
  const maelstromPerformance = determinePerformance(modules.maelstromDetails.wastedPercent, {
    perfectPct: wastedThresholds.isGreaterThan.minor,
    goodPct: wastedThresholds.isGreaterThan.average,
    okPct: wastedThresholds.isGreaterThan.major,
  });

  return (
    <SubSection title="Maelstrom">
      The gameplay loop of Elemental Shaman is centered around casting spells to generate Maelstrom,
      then spending it. You should therefore aim to not waste any Maelstrom by overcapping. You
      overcapped{' '}
      <PerformancePercentage
        performance={maelstromPerformance}
        flatAmount={modules.maelstromDetails.wasted}
        percentage={modules.maelstromDetails.wastedPercent}
        perfectPercentage={wastedThresholds.isGreaterThan.minor}
        goodPercentage={wastedThresholds.isGreaterThan.average}
        okPercentage={wastedThresholds.isGreaterThan.major}
      />{' '}
      maelstrom during this fight.
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
          Graph showing maelstrom generation and spending, as well as how much you overcapped and
          when.
        </small>
        {modules.maelstromGraph.plot}
      </Expandable>
    </SubSection>
  );
}

function CooldownAndResourceUsageSection({
  modules,
  events,
  info,
}: GuideProps<typeof CombatLogParser>) {
  return (
    <Section title="Cooldown and resources">
      <GenericCooldownGraphSubsection
        cooldownsToCheck={[
          { talent: TALENTS.STORM_ELEMENTAL_TALENT },
          { talent: TALENTS.FIRE_ELEMENTAL_TALENT },
          { talent: TALENTS.STORMKEEPER_1_ELEMENTAL_TALENT },
          { talent: TALENTS.ICEFURY_TALENT },
          { talent: TALENTS.ASCENDANCE_ELEMENTAL_TALENT },
          { talent: TALENTS.PRIMORDIAL_WAVE_TALENT },
          { talent: TALENTS.LIQUID_MAGMA_TOTEM_TALENT },
        ]}
      />
      <ResourceSubsection modules={modules} events={events} info={info} />
      {modules.alwaysBeCasting.guideSubsection}
    </Section>
  );
}

export default function Guide({ modules, events, info }: GuideProps<typeof CombatLogParser>) {
  return (
    <>
      <CooldownAndResourceUsageSection modules={modules} events={events} info={info} />
      <CoreRotationSection modules={modules} events={events} info={info} />
      <UtilityAndOthersSections modules={modules} events={events} info={info} />
      <PreparationSection />
    </>
  );
}
