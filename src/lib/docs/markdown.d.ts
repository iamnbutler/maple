// `?raw` imports of the bundled markdown guide.
declare module '*.md?raw' {
	const content: string;
	export default content;
}
