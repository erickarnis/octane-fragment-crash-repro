import { afterEach, expect, it } from 'vitest';
import { Fragment, createElement, createRoot, flushSync, useState } from 'octane';
import { Panel } from './minimal-repro.tsx';
import { PlanPreview, arrive } from './app-shape.tsx';

const cleanups: Array<() => void> = [];
afterEach(() => {
	while (cleanups.length) cleanups.pop()!();
});

// A focusable heading outside the root, focused as the app's router does.
function setup(focusHeading: boolean) {
	const heading = document.createElement('h1');
	heading.tabIndex = -1;
	heading.textContent = 'Plan a trip';
	document.body.appendChild(heading);
	if (focusHeading) heading.focus();
	const container = document.createElement('div');
	document.body.appendChild(container);
	const root = createRoot(container);
	cleanups.push(() => {
		try {
			root.unmount();
		} catch {}
		container.remove();
		heading.remove();
	});
	return { container, root, heading };
}

for (const focusHeading of [true, false]) {
	const label = focusHeading ? 'heading focused' : 'nothing focused';

	it(`JSX snippet: root.render(data=null) then data={} (${label})`, () => {
		const { container, root } = setup(focusHeading);
		flushSync(() => root.render(Panel, { data: null }));
		expect(container.textContent).toBe('Loading…');
		flushSync(() => root.render(Panel, { data: {} }));
		expect(container.textContent).toBe('body');
		flushSync(() => root.render(Panel, { data: { note: 'noted' } }));
		expect(container.textContent).toBe('notedbody');
	});

	it(`app shape: query data arrives (${label})`, () => {
		const { container, root } = setup(focusHeading);
		flushSync(() => root.render(PlanPreview));
		flushSync(() => arrive({ name: 'Lisbon', overlaps: [], longStay: false }));
		expect(container.textContent).toBe('Lisbonform');
	});

	it(`createElement only, no compiler (${label})`, () => {
		const { container, root } = setup(focusHeading);
		let load: () => void = () => {};
		function App() {
			const [data, setData] = useState<{ note?: string } | null>(null);
			load = () => setData({});
			return data === null
				? createElement('div', null, createElement('span', null, 'Loading…'))
				: createElement(
						'div',
						null,
						createElement(Fragment, {
							children: [data.note && createElement('p', null, data.note), createElement('p', null, 'body')],
						}),
					);
		}
		flushSync(() => root.render(App));
		flushSync(() => load());
		expect(container.textContent).toBe('body');
	});
}
