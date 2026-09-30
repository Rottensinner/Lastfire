import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSSRApp, h } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { useGame } from '../src/useGame';

test('uszkodzony zapis nie jest nadpisywany nawet gdy kopia nie może zostać zapisana', async () => {
  const original = '{"broken":true}';
  const values = new Map([['ostatnie-ognisko-v2', original]]);
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let failRecovery = true;
  Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (key.endsWith('-recovery') && failRecovery) throw new Error('storage full');
      values.set(key, value);
    },
  }});
  try {
    let controller: ReturnType<typeof useGame> | undefined;
    await renderToString(createSSRApp({setup() { controller = useGame(); return () => h('div'); }}));
    assert.ok(controller);
    assert.equal(controller.recoveryAvailable.value, true);
    assert.equal(controller.save(), false);
    assert.equal(values.get('ostatnie-ognisko-v2'), original);
    failRecovery = false;
    await controller.restore(new File(['not json'], 'bad.json'));
    assert.equal(controller.recoveryAvailable.value, true);
    assert.equal(values.get('ostatnie-ognisko-v2'), original);
    controller.reset();
    assert.equal(controller.recoveryAvailable.value, false);
    assert.equal(JSON.parse(values.get('ostatnie-ognisko-v2')!).version, 2);
    assert.equal(controller.save(), true);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
