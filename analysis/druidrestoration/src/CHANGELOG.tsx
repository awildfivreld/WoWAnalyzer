import { change, date } from 'common/changelog';
import SPELLS from 'common/SPELLS';
import { Adoraci, Yajinni, Abelito75, Zeboot, LeoZhekov, Putro, Vexxra, Tiboonn, Ciuffi, Sref } from 'CONTRIBUTORS';
import SpellLink from 'interface/SpellLink';

export default [
  change(date(2022, 6, 9), <>Fixed handling of <SpellLink id={SPELLS.PHOTOSYNTHESIS_TALENT.id} /> to count <SpellLink id={SPELLS.ADAPTIVE_SWARM.id} /> in increase HoT rate and to work properly with <SpellLink id={SPELLS.THE_DARK_TITANS_LESSON.id} />. Also cleaned up the tooltip and made some minor fixes to spell lists.</>, Sref),
  change(date(2022, 5, 19), <>Fixed Always be Healing.</>, Abelito75),
  change(date(2022, 4, 24), <>Added healing boosted by <SpellLink id={SPELLS.IRONBARK.id} /> its statistic box.</>, Sref),
  change(date(2022, 3, 30), <>Added <SpellLink id={SPELLS.TRANQUILITY_CAST.id} /> to throughput tracker to allow user to better compare timing / healing with other CDs.</>, Sref),
  change(date(2022, 2, 18), <>Added stat boxes for upcoming tier set bonuses - <SpellLink id={SPELLS.RESTO_DRUID_TIER_28_2P_SET_BONUS.id} /> and <SpellLink id={SPELLS.RESTO_DRUID_TIER_28_4P_SET_BONUS.id} /></>, Sref),
  change(date(2022, 1, 29), <>Fixed a bug where <SpellLink id={SPELLS.KINDRED_SPIRITS.id} /> statistic would occasionally overcount when linked to another healer</>, Sref),
  change(date(2022, 1, 17), <>Fixed many issues with the Mana Efficiency chart, and added explanation text.</>, Sref),
  change(date(2022, 1, 16), <>Added a damage statistic for <SpellLink id={SPELLS.DRAUGHT_OF_DEEP_FOCUS.id}/> for Resto players who are a healer, but...</>, Sref),
  change(date(2021, 11, 13), <>Updated wording of <SpellLink id={SPELLS.REGROWTH.id}/> statistic and made it more permissive of triage casts.</>, Sref),
  change(date(2021, 11, 12), <>Updated to indicate this spec is supported for patch 9.1.5</>, Sref),
  change(date(2021, 11, 11), <>Removed healer stat weights in favor of QElive.</>, Abelito75),
  change(date(2021, 8, 3), <>Updated to indicate this spec is supported for patch 9.1</>, Sref),
  change(date(2021, 7, 28), <>Added <SpellLink id={SPELLS.ADAPTIVE_ARMOR_FRAGMENT.id}/> statistic for the benefit of very particular and demanding raiders who must know the difference between 1.0% and 1.5% and are willing to bother developers on Discord to find out.</>, Sref),
  change(date(2021, 7, 28), <>Added <SpellLink id={SPELLS.CONVOKE_SPIRITS.id}/> cast efficiency to checklist, and updated it to account for <SpellLink id={SPELLS.CELESTIAL_SPIRITS.id}/>.</>, Sref),
  change(date(2021, 7, 25), <>Added proper haste tracking for <SpellLink id={SPELLS.RAVENOUS_FRENZY.id}/> and <SpellLink id={SPELLS.SINFUL_HYSTERIA.id}/>.</>, Sref),
  change(date(2021, 6, 18), <>Updated <SpellLink id={SPELLS.EFFLORESCENCE_CAST.id} /> tracking to account for the number of players actually being effected by it.</>, Sref),
  change(date(2021, 6, 14), <>Fixed a bug where a hardcast <SpellLink id={SPELLS.FLOURISH_TALENT.id} /> could be counted as part of a Convoke if cast immediately before or after the Convoke.</>, Sref),
  change(date(2021, 6, 14), <>Added to the stat box tooltip of <SpellLink id={SPELLS.CONVOKE_SPIRITS.id} /> showing the beneift of activating <SpellLink id={SPELLS.NATURES_SWIFTNESS.id} /> before convoking.</>, Sref),
  change(date(2021, 6, 14), <>Updated <SpellLink id={SPELLS.SOUL_OF_THE_FOREST_TALENT_RESTORATION.id} /> stat to properly account for Convoke, to better account for edge case issues, and updated the tooltip.</>, Sref),
  change(date(2021, 6, 6), <>Fixed an issue where <SpellLink id={SPELLS.ABUNDANCE_TALENT.id} /> related items were referenced in the Regrowth stat box even when the player doesn't have the talent.</>, Sref),
  change(date(2021, 6, 6), <>Fixed an issue where <SpellLink id={SPELLS.IRONBARK.id} /> cooldown was listed at 60 instead of 90.</>, Sref),
  change(date(2021, 6, 1), 'Updated the Early Rejuvenation module to display per-minute and to properly account for Convoked Flourish', Sref),
  change(date(2021, 5, 30), <>Added <SpellLink id={SPELLS.LYCARAS_FLEETING_GLIMPSE.id} /> support. Reworked backend handling of HoT attributions and fixed some issues: <SpellLink id={SPELLS.VISION_OF_UNENDING_GROWTH.id} /> now accounts for mastery, and <SpellLink id={SPELLS.MEMORY_OF_THE_MOTHER_TREE.id} /> now accounts for mastery and no longer incorrectly gives continuing heal credit when a procced HoT is refreshed by a hardcast. Also fixed an issue where the initial heal from <SpellLink id={SPELLS.REGROWTH.id} /> was incorrectly counted as benefitting from its own mastery stack.</>, Sref),
  change(date(2021, 5, 27), <>Fixed an issue where <SpellLink id={SPELLS.NATURES_SWIFTNESS.id} /> buffed <SpellLink id={SPELLS.REGROWTH.id} /> wasn't being counted as free by the tracker.</>, Sref),
  change(date(2021, 5, 26), <>Reworked <SpellLink id={SPELLS.REGROWTH.id} /> and <SpellLink id={SPELLS.CLEARCASTING_BUFF.id} /> stats into a single box, and fixed some bugs in their display. Reworked display of average <SpellLink id={SPELLS.WILD_GROWTH.id} /> hits and fixed a bug where it was counting buffs from Convoke.</>, Sref),
  change(date(2021, 5, 26), <>Moved all talent related stat boxes to their own section, and combined <SpellLink id={SPELLS.LIFEBLOOM_HOT_HEAL.id} /> and <SpellLink id={SPELLS.EFFLORESCENCE_CAST.id} /> uptimes into a new graph.</>, Sref),
  change(date(2021, 5, 18), <>Added <SpellLink id={SPELLS.FIELD_OF_BLOSSOMS.id} /> support</>, Sref),
  change(date(2021, 5, 18), <>Added an entry for <SpellLink id={SPELLS.FLOURISH_TALENT.id} /> on the Cooldowns tab</>, Sref),
  change(date(2021, 5, 18), <>Added <SpellLink id={SPELLS.GROVE_INVIGORATION.id} /> support</>, Sref),
  change(date(2021, 5, 15), <>Improved cast detection and added healing attribution for <SpellLink id={SPELLS.CONVOKE_SPIRITS.id} /></>, Sref),
  change(date(2021, 5, 14), <>Added <SpellLink id={SPELLS.KINDRED_SPIRITS.id} /> support</>, Sref),
  change(date(2021, 5, 14), <>Added <SpellLink id={SPELLS.VERDANT_INFUSION.id} /> support</>, Sref),
  change(date(2021, 5, 14), <>Added <SpellLink id={SPELLS.CONFLUX_OF_ELEMENTS.id} /> support</>, Sref),
  change(date(2021, 5, 12), 'Fixed an issue where the Swiftmend cast efficiency rule displayed wrong at low efficiency', Sref),
  change(date(2021, 5, 8), <>Cleaned up <SpellLink id={SPELLS.FLOURISH_TALENT.id} /> module and improved its attribution to be better in some edge cases.</>, Sref),
  change(date(2021, 5, 5), <>Added <SpellLink id={SPELLS.ADAPTIVE_SWARM.id} /> and <SpellLink id={SPELLS.EVOLVED_SWARM.id} /> support</>, Sref),
  change(date(2021, 5, 4), 'Re-added myself as spec maintainer and updated visuals of percent increase stats boxes.', Sref),
  change(date(2021, 5, 4), 'Converted all remaining modules to TypeScript and updated HoT Tracking in preparation for future work', Sref),
  change(date(2021, 4, 14), 'Converted Mastery to TypeScript', Sref),
  change(date(2021, 4, 3), 'Verified 9.0.5 patch changes and bumped support to 9.0.5', Adoraci),
  change(date(2021, 2, 12), 'Added form tracking to the convoke module', Ciuffi),
  change(date(2021, 1, 16), 'Added spell information for conduits', Tiboonn),
  change(date(2021, 1, 16), 'Due to the paywalling of the timeline feature, and fundamental differences of opinion - I will no longer be updating this module beyond todays date. All the modules should be accurate for Castle Nathria, but will not be accurate going forward.', Abelito75),
  change(date(2020, 12, 24), 'Fixed a bug in the Lifebloom module where it was erroring out the module because it wasn\'t showing Dark Titan\'s Lesson properly', Yajinni),
  change(date(2021, 1, 12), '9.0.2 supported!!!', Abelito75),
  change(date(2021, 1, 9), 'Converting the majority to typescript!', Abelito75),
  change(date(2021, 1, 9), 'Added Memory of the Mother Tree legendary stat!', Abelito75),
  change(date(2021, 1, 7), 'Another bug fix for Vision of Unending Growth.', Abelito75),
  change(date(2021, 1, 5), 'Noticed a small bug that was infalting the value of Vision of Unending Growth.', Abelito75),
  change(date(2021, 1, 2), 'Made a Convoke the Spirits tracker.', Abelito75),
  change(date(2021, 1, 2), 'Converted a few files to typescript.', Abelito75),
  change(date(2021, 1, 2), 'Re-wrote soul of the forest to be a bit more accurate.', Abelito75),
  change(date(2021, 1, 2), 'Fixed an issue with innervate.', Abelito75),
  change(date(2020, 12, 24), 'Added support for Dark Titan\'s Lesson', Vexxra),
  change(date(2020, 12, 19), 'Fixed an issue with innervate.', Abelito75),
  change(date(2020, 12, 19), 'Updated Innervate to factor in self casts are bad and correct mana spent value.', Abelito75),
  change(date(2020, 12, 15), 'Bumped level of support to 9.0.2', Putro),
  change(date(2020, 12, 13), 'Added Vision of Unending Growth', Abelito75),
  change(date(2020, 11, 19), 'Fixed Tree of Life not tracking healing', Abelito75),
  change(date(2020, 11, 19), 'Replaced the deprecated StatisticBoxes with the new Statistics', LeoZhekov),
  change(date(2020, 10, 25), 'Updated spell book and to use common libraries', Abelito75),
  change(date(2020, 10, 18), 'Converted legacy listeners to new event filters', Zeboot),
  change(date(2020, 9, 26), 'Added Flash of Clarity conduit.', Abelito75),
];
