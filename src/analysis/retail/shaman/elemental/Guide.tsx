import { GuideProps } from 'interface/guide';
import CombatLogParser from './CombatLogParser';
import CoreRotationSection from './modules/guide/CoreRotationSection';

export default function Guide({ modules, events, info }: GuideProps<typeof CombatLogParser>) {
  return (
    <>
      <CoreRotationSection modules={modules} events={events} info={info} />
    </>
  );
}
