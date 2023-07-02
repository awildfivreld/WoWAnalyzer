import { GuideProps } from 'interface/guide';
import CombatLogParser from './CombatLogParser';
import CoreRotationSection from './modules/guide/CoreRotationSection';
import UtilityAndOthersSections from './modules/core/UtilityAndOthersSection';
import PreparationSection from 'interface/guide/components/Preparation/PreparationSection';

export default function Guide({ modules, events, info }: GuideProps<typeof CombatLogParser>) {
  return (
    <>
      <CoreRotationSection modules={modules} events={events} info={info} />
      <UtilityAndOthersSections modules={modules} events={events} info={info} />
      <PreparationSection />
    </>
  );
}
