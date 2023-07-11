import { GuideProps, Section } from 'interface/guide';
import CombatLogParser from '../../CombatLogParser';
import CooldownUsage from 'parser/core/MajorCooldowns/CooldownUsage';
import FlameshockSubSection from './FlameshockSubSection';

export default function CoreRotationSection({
  modules,
  events,
  info,
}: GuideProps<typeof CombatLogParser>) {
  return (
    <Section title="Core rotation">
      <CooldownUsage analyzer={modules.stormkeeper} />
      {modules.spenderWindow.guideSubsection}
      {modules.icefury.guideSubsection}
      {modules.electrifiedShocks.guideSubsection}
      <FlameshockSubSection modules={modules} events={events} info={info} />
    </Section>
  );
}
