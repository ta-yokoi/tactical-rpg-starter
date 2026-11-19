import { equipment, formationBonuses, readFormation, training, type Formation } from '../game/formation';
import { initialState } from '../game/rules';
import { unitProfile } from '../game/units';
import { drawPortrait } from './portraits';

const groups = { astel: equipment.astel, lina: equipment.lina, training };

export class FormationDialog {
  private readonly dialog = document.querySelector<HTMLDialogElement>('#formation-dialog')!;
  private readonly form = this.dialog.querySelector('form')!;

  constructor(save: (formation: Formation) => void, deploy: () => void) {
    this.dialog.querySelectorAll<HTMLCanvasElement>('canvas[data-portrait]').forEach(canvas => {
      drawPortrait(canvas, canvas.dataset.portrait!);
    });
    for (const [group, options] of Object.entries(groups)) {
      const container = this.dialog.querySelector(`#${group}-options`)!;
      for (const [value, option] of Object.entries(options)) {
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = group;
        input.value = value;
        const text = document.createElement('span');
        const name = document.createElement('strong');
        name.textContent = option.name;
        const detail = document.createElement('small');
        detail.textContent = option.detail;
        text.append(name, detail);
        label.append(input, text);
        container.append(label);
      }
    }
    this.form.addEventListener('change', () => {
      const fields = new FormData(this.form);
      const formation = readFormation({
        astel: fields.get('astel'), lina: fields.get('lina'), training: fields.get('training'),
      });
      if (formation) {
        this.preview(formation);
        save(formation);
      }
    });
    this.dialog.addEventListener('close', () => {
      if (this.dialog.returnValue === 'deploy') deploy();
    });
  }

  open(formation: Formation): void {
    for (const group of Object.keys(groups) as (keyof Formation)[]) {
      const inputs = this.form.elements.namedItem(group) as RadioNodeList;
      inputs.value = formation[group];
    }
    this.preview(formation);
    this.dialog.returnValue = '';
    this.dialog.showModal();
  }

  private preview(formation: Formation): void {
    const base = initialState(2);
    for (const [group, id] of [['astel', 'blue-1'], ['lina', 'blue-2']] as const) {
      const before = unitProfile(id);
      const after = unitProfile(id, formation);
      const baseHp = base.units.find(unit => unit.id === id)!.maxHp;
      const hp = baseHp + formationBonuses(id, formation).hp;
      const changes = [
        ['HP', baseHp, hp], ['攻撃', before.power, after.power],
        ['守備', before.defense, after.defense], ['耐術', before.ward, after.ward],
      ] as const;
      const preview = this.dialog.querySelector(`#${group}-preview`)!;
      preview.replaceChildren(...changes.map(([label, from, to]) => {
        const stat = document.createElement('span');
        if (from !== to) stat.className = to > from ? 'stat-up' : 'stat-down';
        stat.textContent = `${label} ${from === to ? to : `${from} → ${to}`}`;
        return stat;
      }));
    }
  }
}
