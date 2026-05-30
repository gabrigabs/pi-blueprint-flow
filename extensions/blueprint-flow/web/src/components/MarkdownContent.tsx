import type React from "react";

interface MarkdownContentProps {
	content: string;
	searchQuery?: string;
}

export function MarkdownContent({ content, searchQuery = "" }: MarkdownContentProps) {
	const lines = content.split("\n");

	return (
		<div className="space-y-1 text-sm text-gray-300">
			{lines.map((line, i) => {
				const highlighted = highlightSearch(line, searchQuery);

				if (line.startsWith("### ")) {
					return (
						<h4 key={i} className="text-sm font-semibold text-gray-200 mt-3 mb-1">
							{highlighted || line.slice(4)}
						</h4>
					);
				}
				if (line.startsWith("## ")) {
					return (
						<h3 key={i} className="text-sm font-bold text-gray-100 mt-4 mb-1 border-b border-gray-800 pb-1">
							{highlighted || line.slice(3)}
						</h3>
					);
				}
				if (line.startsWith("# ")) {
					return (
						<h2 key={i} className="text-base font-bold text-white mt-4 mb-2">
							{highlighted || line.slice(2)}
						</h2>
					);
				}

				if (line.startsWith("```")) {
					return <div key={i} className="border-t border-gray-800 my-1" />;
				}

				if (line.startsWith("- [x] ")) {
					return (
						<div key={i} className="flex items-center gap-2 text-emerald-400">
							<span className="text-xs">&#9745;</span>
							<span>{highlighted || line.slice(6)}</span>
						</div>
					);
				}
				if (line.startsWith("- [ ] ")) {
					return (
						<div key={i} className="flex items-center gap-2 text-gray-400">
							<span className="text-xs">&#9744;</span>
							<span>{highlighted || line.slice(6)}</span>
						</div>
					);
				}

				if (line.startsWith("- ") || line.startsWith("* ")) {
					return (
						<div key={i} className="flex items-start gap-2 pl-2">
							<span className="text-gray-600 mt-1.5 text-[6px]">&#9679;</span>
							<span>{highlighted || line.slice(2)}</span>
						</div>
					);
				}

				if (/^\d+\.\s/.test(line)) {
					const match = line.match(/^(\d+)\.\s(.*)$/);
					if (match) {
						return (
							<div key={i} className="flex items-start gap-2 pl-2">
								<span className="text-gray-500 text-xs font-mono w-4 shrink-0">
									{match[1]}.
								</span>
								<span>{highlighted || match[2]}</span>
							</div>
						);
					}
				}

				if (line.startsWith("> ")) {
					return (
						<div key={i} className="border-l-2 border-gray-600 pl-3 text-gray-400 italic">
							{highlighted || line.slice(2)}
						</div>
					);
				}

				if (line.trim() === "") {
					return <div key={i} className="h-2" />;
				}

				if (line.startsWith("  ") || line.startsWith("\t")) {
					return (
						<div key={i} className="font-mono text-xs text-blue-300/80 bg-gray-900 px-2 py-0.5 rounded">
							{highlighted || line}
						</div>
					);
				}

				return (
					<p key={i} className="leading-relaxed">
						{highlighted || line}
					</p>
				);
			})}
		</div>
	);
}

// --- Helpers ---

function highlightSearch(text: string, query: string): React.ReactNode | null {
	if (!query || !text.toLowerCase().includes(query.toLowerCase())) return null;

	const idx = text.toLowerCase().indexOf(query.toLowerCase());
	return (
		<>
			{text.slice(0, idx)}
			<mark className="bg-yellow-500/30 text-yellow-200 rounded px-0.5">
				{text.slice(idx, idx + query.length)}
			</mark>
			{text.slice(idx + query.length)}
		</>
	);
}