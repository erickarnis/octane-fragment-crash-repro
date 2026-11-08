import { expect, it } from 'vitest';
import { Fragment, createElement, createRoot, flushSync, useState } from 'octane';

// Related, no crash: an empty Fragment (no children at all) keeps the old child.
it('an empty Fragment replacing a same-tag host child list clears it', () => {
	const container = document.createElement('div');
	document.body.appendChild(container);
	const root = createRoot(container);
	let load: () => void = () => {};
	function App() {
		const [loaded, setLoaded] = useState(false);
		load = () => setLoaded(true);
		return loaded
			? createElement('div', null, createElement(Fragment, null))
			: createElement('div', null, createElement('span', null, 'Loading…'));
	}
	flushSync(() => root.render(App));
	flushSync(() => load());
	expect(container.innerHTML).not.toContain('Loading');
	root.unmount();
	container.remove();
});
