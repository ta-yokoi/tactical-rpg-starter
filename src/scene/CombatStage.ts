import { COMBAT_SIZE, combatBackdrop, drawCombatant, type ArenaGround, type Pose } from './combatArt';
import type { Strike, Unit } from '../game/rules';
import { unitProfile } from '../game/units';
import { drawPortrait } from './portraits';

export const duelTiming = { enter: 120, blade: 260, spell: 345, impact: 410, exit: 125 };
export const duelGroundLabels = { road: '古道', wood: '川辺の橋', meadow: '草地' } as const;

type Fighter = { unit: Unit; actor: HTMLElement; card: HTMLElement };

export class CombatStage {
  private readonly stage = document.querySelector<HTMLElement>('#combat-stage')!;
  private readonly label = document.querySelector<HTMLElement>('#stage-label')!;
  private readonly backgrounds = new Map<ArenaGround, string>();
  private fighters: Fighter[] = [];

  open(first: Unit, second: Unit, ground: ArenaGround, gear: (unit: Unit) => string): void {
    const landscape = this.backgrounds.get(ground) ?? combatBackdrop(ground);
    this.backgrounds.set(ground, landscape);
    this.stage.style.setProperty('--battle-backdrop', landscape);
    this.stage.className = 'combat-stage';
    this.stage.hidden = false;
    this.stage.classList.add('entering');
    this.label.textContent = '交戦';
    document.querySelector('#duel-ground')!.textContent = duelGroundLabels[ground];
    this.fighters = [first, second].map((unit, index) => {
      const side = index === 0 ? 'left' : 'right';
      const actor = document.querySelector<HTMLElement>(`#stage-${side}`)!;
      const card = document.querySelector<HTMLElement>(`#hud-${side}`)!;
      actor.querySelector('.duel-damage')!.textContent = '';
      actor.classList.remove('fallen');
      card.dataset.team = unit.team;
      card.querySelector('strong')!.textContent = unitProfile(unit.id).name;
      card.querySelector('.duel-weapon')!.textContent = gear(unit);
      drawPortrait(card.querySelector('canvas')!, unit.id);
      const canvas = actor.querySelector('canvas')!;
      canvas.width = canvas.height = COMBAT_SIZE;
      const fighter = { unit, actor, card };
      this.drawPose(fighter, 'ready');
      this.updateHp(fighter, unit.hp);
      return fighter;
    });
  }

  windup(strike: Strike, counter: boolean): void {
    const attacker = this.find(strike.attackerId);
    for (const fighter of this.fighters) {
      fighter.actor.querySelector('.duel-damage')!.textContent = '';
      this.drawPose(fighter, fighter === attacker ? 'windup' : 'ready');
    }
    const side = this.fighters[0] === attacker ? 'left' : 'right';
    this.stage.className = 'combat-stage';
    void this.stage.offsetWidth;
    this.stage.classList.add(side, unitProfile(strike.attackerId).style, 'windup');
    this.label.textContent = counter ? '反撃' : '先制攻撃';
  }

  impact(strike: Strike): void {
    this.stage.classList.remove('windup');
    this.stage.classList.add('impact');
    this.label.textContent += `　−${strike.damage}${strike.remainingHp === 0 ? '　撃破' : ''}`;
    const target = this.find(strike.defenderId);
    target.actor.querySelector('.duel-damage')!.textContent = `−${strike.damage}`;
    this.drawPose(target, 'hit');
    this.drawPose(this.find(strike.attackerId), 'strike');
    this.updateHp(target, strike.remainingHp);
  }

  fall(id: string): void { this.find(id).actor.classList.add('fallen'); }

  exit(): void { this.stage.classList.add('leaving'); }

  close(): void { this.stage.hidden = true; }

  private find(id: string): Fighter { return this.fighters.find(fighter => fighter.unit.id === id)!; }

  private drawPose(fighter: Fighter, pose: Pose): void {
    drawCombatant(fighter.actor.querySelector('canvas')!, fighter.unit.id, pose);
  }

  private updateHp(fighter: Fighter, hp: number): void {
    const meter = fighter.card.querySelector<HTMLElement>('.duel-hp')!;
    meter.setAttribute('aria-valuemax', String(fighter.unit.maxHp));
    meter.setAttribute('aria-valuenow', String(hp));
    meter.style.setProperty('--life', `${hp / fighter.unit.maxHp * 100}%`);
    fighter.card.querySelector('small')!.textContent = `${hp} / ${fighter.unit.maxHp}`;
  }
}
