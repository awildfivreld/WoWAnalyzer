import TALENTS from 'common/TALENTS/shaman';
import CombatLogParser from '../../CombatLogParser';
import { GapHighlight } from 'parser/ui/CooldownBar';
import { GuideProps, Section } from 'interface/guide';
import GenericCooldownGraphSubsection from '../guide/GenericCooldownGraphSubsection';

export default function UtilityAndOthersSections({
  modules,
  events,
  info,
}: GuideProps<typeof CombatLogParser>) {
  return (
    <Section title="Utility">
      <GenericCooldownGraphSubsection
        cooldownsToCheck={[
          { talent: TALENTS.ASTRAL_SHIFT_TALENT },
          { talent: TALENTS.EARTH_ELEMENTAL_TALENT },
          { talent: TALENTS.WIND_SHEAR_TALENT },
          { talent: TALENTS.NATURES_SWIFTNESS_TALENT },
          { talent: TALENTS.ANCESTRAL_GUIDANCE_TALENT },
          { talent: TALENTS.SPIRITWALKERS_GRACE_TALENT },
          { talent: TALENTS.CAPACITOR_TOTEM_TALENT },
        ]}
        efficiencyBarGapHighlightMode={GapHighlight.None}
        description={
          <>
            <strong> Utility cooldown graph</strong> - This graph shows the cooldowns of your
            utility spells.{' '}
            <strong>You do not necessesarly always want to use these on cooldown</strong>, but you
            may get some advantage by using them more often.
          </>
        }
      />
    </Section>
  );
}
