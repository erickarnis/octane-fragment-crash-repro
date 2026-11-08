/** @jsxImportSource octane */
// The Nature By Name shape (src/app/Trips.tsx PlanPreview at edd7ec8), cut down:
// a QueryResult-like wrapper swaps a loading <div> for a <div> holding a
// render-prop result, and the render prop returns a fragment of && holes.
import { useState, type OctaneNode } from 'octane';

type Preview = { name: string; overlaps: { name: string }[]; longStay: boolean };

let resolveQuery: (data: Preview) => void = () => {};
export function arrive(data: Preview) {
	resolveQuery(data);
}

function QueryResult(props: { data: Preview | undefined; children: (data: Preview) => OctaneNode }) {
	const { data } = props;
	return (
		<div>
			{data !== undefined ? (
				<div>{props.children(data)}</div>
			) : (
				<div role="status">
					<span>Loading…</span>
					<p>Looking up what people record there…</p>
				</div>
			)}
		</div>
	);
}

export function PlanPreview() {
	const [data, setData] = useState<Preview | undefined>(undefined);
	resolveQuery = setData;
	return (
		<QueryResult data={data}>
			{(data) => (
				<>
					<p>{data.name}</p>
					{data.overlaps[0] && <div>These dates overlap your {data.overlaps[0].name} trip.</div>}
					{data.longStay && <div>Make it your home?</div>}
					<p>form</p>
				</>
			)}
		</QueryResult>
	);
}
