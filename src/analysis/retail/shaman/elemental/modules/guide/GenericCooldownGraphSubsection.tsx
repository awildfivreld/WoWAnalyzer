import { Talent } from 'common/TALENTS/types';
import { SubSection, useAnalyzer, useInfo } from 'interface/guide';
import CastEfficiency from 'parser/shared/modules/CastEfficiency';
import CastEfficiencyBar from 'parser/ui/CastEfficiencyBar';
import { GapHighlight } from 'parser/ui/CooldownBar';

type Cooldown = {
  /** The talent itself */
  talent: Talent;
  /**
   * If specified, any additional talents the user must have for this cooldown to be included.
   * Can be used if the cooldown is only relevant for specific talent combinations.
   */
  extraTalents?: Talent[];
};

type Props = {
  /** The cooldowns to include. */
  cooldownsToCheck: Cooldown[];
  /** The description to show above the cooldown graph. Will default to some
   * generic flavour text.
   */
  description?: JSX.Element | null;
  efficiencyBarGapHighlightMode?: GapHighlight;
};

const defaultGenericCooldownGraphSectionDescription = (
  <>
    <div>
      <strong>Cooldown Graph</strong> - this graph shows when you used your cooldowns and how long
      you waited to use them again. Grey segments show when the spell was available, yellow segments
      show when the spell was cooling down. Red segments highlight times when you could have fit a
      whole extra use of the cooldown.
    </div>
  </>
);

/**
 * A subsection to show the cast efficiency of the provided cooldowns.
 *
 * More specifically shows a {@link CastEfficiencyBar} for each cooldown
 * specified.
 *
 * This subsection can for example be used to give the user a quick overview of
 * if they have cast important cooldowns on cooldown.
 *
 * @param cooldownsToCheck the cooldowns to include in the graph.
 * @param description the description to show above the cooldown graph.
 *   will default to some flavour text if not specified.
 * @param efficiencyBarGapHighlightMode the gap highlight mode to use for the
 *  {@link CastEfficiencyBar}s. Defaults to {@link GapHighlight.FullCooldown}.
 */
export default function GenericCooldownGraphSubsection({
  cooldownsToCheck,
  description = null,
  efficiencyBarGapHighlightMode = GapHighlight.FullCooldown,
}: Props): JSX.Element | null {
  const info = useInfo();
  const castEfficiency = useAnalyzer(CastEfficiency);
  if (!info || !castEfficiency) {
    return null;
  }

  const cooldowns = cooldownsToCheck.filter((cooldown) => {
    const hasTalent = info.combatant.hasTalent(cooldown.talent);
    const hasExtraTalents =
      cooldown.extraTalents?.reduce(
        (acc, talent) => acc && info.combatant.hasTalent(talent),
        true,
      ) ?? true;
    /* Only include the cooldown if the user has all required talents */
    return hasTalent && hasExtraTalents;
  });
  const shouldMinimizeIcons = cooldowns.some((cooldown) => {
    const casts = castEfficiency.getCastEfficiencyForSpell(cooldown.talent)?.casts ?? 0;
    return casts >= 10;
  });

  return (
    <SubSection>
      {description || defaultGenericCooldownGraphSectionDescription}
      {cooldowns.map((cooldownCheck) => (
        <CastEfficiencyBar
          key={cooldownCheck.talent.id}
          spellId={cooldownCheck.talent.id}
          gapHighlightMode={efficiencyBarGapHighlightMode}
          minimizeIcons={shouldMinimizeIcons}
        />
      ))}
    </SubSection>
  );
}
