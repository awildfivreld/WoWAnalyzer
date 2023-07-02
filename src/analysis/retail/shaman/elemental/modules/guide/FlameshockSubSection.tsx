import TALENTS from 'common/TALENTS/shaman';
import SPELLS from 'common/SPELLS';

import { GuideProps, useAnalyzer } from 'interface/guide';
import CombatLogParser from '../../CombatLogParser';
import { explanationAndDataSubsection } from 'interface/guide/components/ExplanationRow';
import uptimeBarSubStatistic from 'parser/ui/UptimeBarSubStatistic';
import Enemies from 'parser/shared/modules/Enemies';
import { SpellLink } from 'interface';
export default function CoreRotationSection({
  modules,
  events,
  info,
}: GuideProps<typeof CombatLogParser>) {
  const enemies = useAnalyzer(Enemies);

  const description = (
    <>
      <SpellLink id={SPELLS.FLAME_SHOCK} /> contributes some damage over time, but mostly serves to
      make sure that <SpellLink id={TALENTS.LAVA_BURST_TALENT} /> always crits. In 1-2 targets, you
      should try to keep this active on all targets.
    </>
  );

  const history = enemies?.getDebuffHistory(SPELLS.FLAME_SHOCK.id);

  const data = (
    <>
      {uptimeBarSubStatistic(
        { start_time: info.fightStart, end_time: info.fightEnd },
        {
          spells: [SPELLS.FLAME_SHOCK],
          uptimes: history || [],
        },
      )}
    </>
  );

  return explanationAndDataSubsection(description, data);
}
