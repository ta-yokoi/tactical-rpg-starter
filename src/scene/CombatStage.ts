import { combatBackdrop, type ArenaGround } from './combatArt';
import { COMBAT_SIZE, drawCombatant, type CombatEquipment, type Pose } from './combatSprites';
import type { Formation } from '../game/formation';
import type { Strike, Unit } from '../game/rules';
import { unitProfile } from '../game/units';
import { drawPortrait } from './portraits';

export const duelTiming = { enter: 120, impact: 410, exit: 125 };
type Motion = 'sword' | 'axe' | 'spell';
const anticipation: Record<Motion, readonly number[]> = {
  sword: [70, 122, 48],
  axe: [112, 140, 56],
  spell: [112, 137, 86],
};
const poses = ['windup', 'advance', 'release'] as const;
export const duelGroundLabels = { road: '古道', wood: '川辺の橋', meadow: '草地' } as const;

type Fighter = { unit: Unit; actor: HTMLElement; card: HTMLElement; equipment: CombatEquipment };

export class CombatStage {
  private readonly stage = document.querySelector<HTMLElement>('#combat-stage')!;
  private readonly label = document.querySelector<HTMLElement>('#stage-label')!;
  private readonly backgrounds = new Map<ArenaGround, string>();
  private fighters: Fighter[] = [];

  constructor(
    private readonly pause: (ms: number) => Promise<void>,
    private readonly reduceMotion: MediaQueryList,
  ) {}

  open(first: Unit, second: Unit, ground: ArenaGround, gear: (unit: Unit) => string, formation?: Formation): void {
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
      const equipment = unit.id === 'blue-1' ? formation?.astel : unit.id === 'blue-2' ? formation?.lina : undefined;
      const fighter: Fighter = { unit, actor, card, equipment: equipment ?? 'standard' };
      this.drawPose(fighter, 'ready');
      this.updateHp(fighter, unit.hp);
      return fighter;
    });
  }

  async windup(strike: Strike, counter: boolean): Promise<void> {
    const attacker = this.find(strike.attackerId);
    const style = unitProfile(strike.attackerId).style;
    const motion = style === 'spell' ? 'spell' : strike.attackerId === 'red-1' ? 'axe' : 'sword';
    for (const fighter of this.fighters) {
      fighter.actor.querySelector('.duel-damage')!.textContent = '';
    }
    const side = this.fighters[0] === attacker ? 'left' : 'right';
    this.stage.className = 'combat-stage';
    this.stage.dataset.motion = motion;
    this.stage.dataset.caster = strike.attackerId;
    this.stage.style.setProperty('--anticipation', `${anticipation[motion].reduce((sum, ms) => sum + ms, 0)}ms`);
    this.stage.classList.add(side, style, 'windup');
    this.label.textContent = counter ? '反撃' : '先制攻撃';
    if (this.reduceMotion.matches) return;
    for (const fighter of this.fighters) {
      if (fighter !== attacker) this.drawPose(fighter, 'guard');
    }
    for (const [index, pose] of poses.entries()) {
      this.drawPose(attacker, pose);
      await this.pause(anticipation[motion][index]);
    }
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

  async recover(strike: Strike): Promise<void> {
    if (this.reduceMotion.matches) {
      await this.pause(duelTiming.impact);
      return;
    }
    await this.pause(151);
    this.drawPose(this.find(strike.attackerId), 'recover');
    if (strike.remainingHp > 0) this.drawPose(this.find(strike.defenderId), 'guard');
    await this.pause(duelTiming.impact - 215);
    this.drawPose(this.find(strike.attackerId), 'ready');
    if (strike.remainingHp > 0) this.drawPose(this.find(strike.defenderId), 'ready');
    await this.pause(64);
  }

  fall(id: string): void { this.find(id).actor.classList.add('fallen'); }

  exit(): void { this.stage.classList.add('leaving'); }

  close(): void { this.stage.hidden = true; }

  private find(id: string): Fighter { return this.fighters.find(fighter => fighter.unit.id === id)!; }

  private drawPose(fighter: Fighter, pose: Pose): void {
    fighter.actor.dataset.pose = pose;
    drawCombatant(fighter.actor.querySelector('canvas')!, fighter.unit.id, pose, fighter.equipment);
  }

  private updateHp(fighter: Fighter, hp: number): void {
    const meter = fighter.card.querySelector<HTMLElement>('.duel-hp')!;
    meter.setAttribute('aria-valuemax', String(fighter.unit.maxHp));
    meter.setAttribute('aria-valuenow', String(hp));
    meter.style.setProperty('--life', `${hp / fighter.unit.maxHp * 100}%`);
    fighter.card.querySelector('small')!.textContent = `${hp} / ${fighter.unit.maxHp}`;
  }
}
