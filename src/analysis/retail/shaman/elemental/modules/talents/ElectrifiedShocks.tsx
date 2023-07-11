import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/shaman';
import Events, { CastEvent, DamageEvent } from 'parser/core/Events';
import Enemies from 'parser/shared/modules/Enemies';
import { SpellLink, TooltipElement } from 'interface';
import { explanationAndDataSubsection } from 'interface/guide/components/ExplanationRow';
import PassFailBar from 'interface/guide/components/PassFailBar';

const NATURE_DAMAGE_SPELLS = [
  SPELLS.LIGHTNING_BOLT,
  TALENTS.CHAIN_LIGHTNING_TALENT,
  TALENTS.ELEMENTAL_BLAST_TALENT,
];

const NATURE_DAMAGE_OVERLOADS = [
  SPELLS.LIGHTNING_BOLT_OVERLOAD_HIT,
  SPELLS.CHAIN_LIGHTNING_OVERLOAD,
  SPELLS.ELEMENTAL_BLAST_OVERLOAD,
];

interface FSCast {
  empowered: number;
  nonEmpowered: number;
}

class ElectrifiedShocks extends Analyzer {
  static dependencies = {
    enemies: Enemies,
  };

  protected enemies!: Enemies;

  frsNatureDamage: { [key: number]: FSCast };
  activeCL: { [key: number]: boolean[] };

  constructor(options: Options) {
    super(options);

    this.frsNatureDamage = {};
    this.activeCL = {};

    if (!this.selectedCombatant.hasTalent(TALENTS.ELECTRIFIED_SHOCKS_TALENT)) {
      return;
    }

    const combined_spells = [...NATURE_DAMAGE_SPELLS, ...NATURE_DAMAGE_OVERLOADS];

    combined_spells.forEach((s) => {
      this.frsNatureDamage[s.id] = { empowered: 0, nonEmpowered: 0 };
    });

    this.addEventListener(
      Events.damage.by(SELECTED_PLAYER).spell(combined_spells),
      this.onNatureDamage,
    );
    this.addEventListener(
      Events.cast
        .by(SELECTED_PLAYER)
        .spell([TALENTS.CHAIN_LIGHTNING_TALENT, SPELLS.CHAIN_LIGHTNING_OVERLOAD]),
      this.onCL,
    );
  }

  onCL(event: CastEvent) {
    /* I could not find a way to determine which CL overloads belong to
    which casts of CL, so this is some bodged logic to replace that.
    
    Every time CL or it's overload deals damage, it's registered in the 'onNatureDamage'
    function below. When CL is cast next time, this function (onCL) registers
    the these previous DamageEvent's as fsCasts.
    
    */
    if (Object.keys(this.activeCL).length === 0) {
      return;
    }

    if ((this.activeCL[TALENTS.CHAIN_LIGHTNING_TALENT.id] || []).length <= 3) {
      Object.entries(this.activeCL).forEach(([spell, casts]) => {
        casts.forEach((empowered) => {
          if (empowered) {
            this.frsNatureDamage[Number(spell)].empowered += 1;
          } else {
            this.frsNatureDamage[Number(spell)].nonEmpowered += 1;
          }
        });
      });
    }

    this.activeCL = {};
  }

  onNatureDamage(event: DamageEvent) {
    const targetHasElshocks =
      this.enemies.getEntity(event)?.hasBuff(TALENTS.ELECTRIFIED_SHOCKS_TALENT.id) || false;

    if (
      [TALENTS.CHAIN_LIGHTNING_TALENT.id, SPELLS.CHAIN_LIGHTNING_OVERLOAD.id].includes(
        event.ability.guid,
      )
    ) {
      if (this.activeCL[event.ability.guid] === undefined) {
        this.activeCL[event.ability.guid] = [];
      }
      this.activeCL[event.ability.guid].push(targetHasElshocks);
      return;
    } else {
      if (targetHasElshocks) {
        this.frsNatureDamage[event.ability.guid].empowered += 1;
      } else {
        this.frsNatureDamage[event.ability.guid].nonEmpowered += 1;
      }
    }
  }

  get guideSubsection() {
    const description = (
      <>
        <SpellLink id={TALENTS.ELECTRIFIED_SHOCKS_TALENT} /> increases all{' '}
        <TooltipElement
          content={
            <>Lightning bolt, Chain lightning, Earth Shock, Earthquake, and respective overloads.</>
          }
        >
          nature damage
        </TooltipElement>{' '}
        done to the target by 15%. This applies to both direct casts and overloads. Therefore, you
        should aim to have this debuff present on every instance of nature damage.
      </>
    );
    /* There is probably a better way to build this table */
    const data = (
      <div>
        <small>Instances of nature damage empowered by Electrified Shocks</small>
        <table>
          <thead>
            <tr>
              <th>Ability</th>
              <th></th>
              <th>Performance</th>
              <th></th>
              <th>Overload Performance</th>
            </tr>
          </thead>
          <tbody>
            {NATURE_DAMAGE_SPELLS.map((v, i) => {
              const pass = this.frsNatureDamage[v.id].empowered;
              const fail = this.frsNatureDamage[v.id].nonEmpowered;
              /* Don't show the row if there were no casts */
              if (pass + fail === 0) {
                return <></>;
              }
              const overloadPass = this.frsNatureDamage[NATURE_DAMAGE_OVERLOADS[i].id].empowered;
              const overloadFail = this.frsNatureDamage[NATURE_DAMAGE_OVERLOADS[i].id].nonEmpowered;

              const isCL = v.id === TALENTS.CHAIN_LIGHTNING_TALENT.id;

              return (
                <>
                  <tr>
                    <td>
                      <SpellLink spell={v} /> {isCL && <>({'<'}= 3 targets)</>}
                    </td>
                    <td>{((pass / (pass + fail)) * 100).toFixed(0)}%</td>
                    <td>
                      <PassFailBar pass={pass} total={pass + fail} />
                    </td>
                    <td>{((overloadPass / (overloadPass + overloadFail)) * 100).toFixed(0)}% </td>
                    <td>
                      <PassFailBar pass={overloadPass} total={overloadPass + overloadFail} />
                    </td>
                  </tr>
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    );

    return explanationAndDataSubsection(description, data);
  }
}

export default ElectrifiedShocks;
