import TALENTS from 'common/TALENTS/shaman';
import { GuideProps, Section } from 'interface/guide';
import CombatLogParser from '../../CombatLogParser';
import GenericCooldownGraphSubsection from './GenericCooldownGraphSubsection';
import CooldownUsage from 'parser/core/MajorCooldowns/CooldownUsage';
import FlameshockSubSection from './FlameshockSubSection';

export default function CoreRotationSection({
  modules,
  events,
  info,
}: GuideProps<typeof CombatLogParser>) {
  return (
    <Section title="Core rotation">
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
      <CooldownUsage analyzer={modules.stormkeeper} />
      {modules.spenderWindow.guideSubsection}
      {modules.icefury.guideSubsection}
      {modules.electrifiedShocks.guideSubsection}
      <FlameshockSubSection modules={modules} events={events} info={info} />
    </Section>
  );
}
