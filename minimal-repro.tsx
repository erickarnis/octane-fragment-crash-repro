/** @jsxImportSource octane */
// Smallest JSX reproduction. The loading branch and the loaded branch are the
// same host tag (<div>). The loaded <div>'s only child is a fragment whose
// first entry renders nothing, at the index where the loading <div> had a
// child (<span>). Rendering `data={null}` then `data={{}}` throws in commit.
export function Panel({ data }: { data: { note?: string } | null }) {
	return data === null ? (
		<div>
			<span>Loading…</span>
		</div>
	) : (
		<div>
			<>
				{data.note && <p>{data.note}</p>}
				<p>body</p>
			</>
		</div>
	);
}
