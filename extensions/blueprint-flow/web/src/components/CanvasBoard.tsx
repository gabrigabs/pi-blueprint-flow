import { Layers } from "lucide-react";

export function CanvasBoard() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-gray-500">
      <Layers size={48} className="text-gray-700" />
      <h3 className="text-lg font-medium text-gray-400">Visual Canvas</h3>
      <p className="max-w-sm text-center text-sm">
        Interactive canvas with React Flow for domain modeling — actors,
        aggregates, events, and bounded contexts. Coming in a future release.
      </p>
    </div>
  );
}
