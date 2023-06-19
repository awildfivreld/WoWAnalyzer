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

class ElectrifiedShocks extends Analyzer {
  static dependencies = {
    enemies: Enemies,
  };

  protected enemies!: Enemies;

  ESEmpoweredSpells: { [key: number]: number };
  nonEmpoweredSpells: { [key: number]: number };
  activeCL: { [key: number]: boolean[] };

  constructor(options: Options) {
    super(options);

    this.ESEmpoweredSpells = {};
    this.nonEmpoweredSpells = {};

    const combined_spells = [...NATURE_DAMAGE_SPELLS, ...NATURE_DAMAGE_OVERLOADS];
    this.activeCL = {};

    combined_spells.forEach((s) => {
      this.ESEmpoweredSpells[s.id] = 0;
      this.nonEmpoweredSpells[s.id] = 0;
    });

    if (!this.selectedCombatant.hasTalent(TALENTS.ELECTRIFIED_SHOCKS_TALENT)) {
      return;
    }

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
    console.log('activeCL', this.activeCL);
    if (Object.keys(this.activeCL).length === 0) {
      return;
    }

    if (this.activeCL[TALENTS.CHAIN_LIGHTNING_TALENT.id].length <= 3) {
      Object.entries(this.activeCL).forEach(([spell, casts]) => {
        casts.forEach((empowered) => {
          if (empowered) {
            this.ESEmpoweredSpells[Number(spell)] += 1;
          } else {
            this.nonEmpoweredSpells[Number(spell)] += 1;
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
    }

    if (targetHasElshocks) {
      this.ESEmpoweredSpells[event.ability.guid] += 1;
    } else {
      this.nonEmpoweredSpells[event.ability.guid] += 1;
    }
  }

  get guideSubsection() {
    console.log(this.ESEmpoweredSpells, this.nonEmpoweredSpells);

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
              const pass = this.ESEmpoweredSpells[v.id];
              const fail = this.nonEmpoweredSpells[v.id];
              if (pass + fail === 0) {
                return <></>;
              }
              const overloadPass = this.ESEmpoweredSpells[NATURE_DAMAGE_OVERLOADS[i].id];
              const overloadFail = this.nonEmpoweredSpells[NATURE_DAMAGE_OVERLOADS[i].id];

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
