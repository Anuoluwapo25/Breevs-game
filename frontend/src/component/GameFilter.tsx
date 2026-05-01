"use client";

import { useState } from "react";
import { GameStatus } from "@/lib/contractCalls";

export interface FilterOptions {
  status?: GameStatus;
  minStake?: string;
  maxStake?: string;
  sortBy: "newest" | "stake" | "players";
  sortOrder: "asc" | "desc";
}

interface GameFilterProps {
  onFilterChange: (filters: FilterOptions) => void;
}

export default function GameFilter({ onFilterChange }: GameFilterProps) {
  const [filters, setFilters] = useState<FilterOptions>({
    sortBy: "newest",
    sortOrder: "desc",
  });

  const handleFilterChange = (newFilters: Partial<FilterOptions>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Game Status
          </label>
          <select
            className="w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600"
            onChange={(e) =>
              handleFilterChange({
                status:
                  e.target.value === "all"
                    ? undefined
                    : (parseInt(e.target.value) as GameStatus),
              })
            }
          >
            <option value="all">All Games</option>
            <option value={GameStatus.Active}>Active</option>
            <option value={GameStatus.InProgress}>In Progress</option>
            <option value={GameStatus.Ended}>Ended</option>
          </select>
        </div>

        {/* Sort By */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Sort By
          </label>
          <select
            className="w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600"
            value={filters.sortBy}
            onChange={(e) =>
              handleFilterChange({
                sortBy: e.target.value as FilterOptions["sortBy"],
              })
            }
          >
            <option value="newest">Newest</option>
            <option value="stake">Stake Amount</option>
            <option value="players">Player Count</option>
          </select>
        </div>

        {/* Sort Order */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Sort Order
          </label>
          <select
            className="w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600"
            value={filters.sortOrder}
            onChange={(e) =>
              handleFilterChange({
                sortOrder: e.target.value as FilterOptions["sortOrder"],
              })
            }
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
      </div>

      {/* Stake Range */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Min Stake
          </label>
          <input
            type="number"
            className="w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600"
            placeholder="0.1"
            onChange={(e) =>
              handleFilterChange({ minStake: e.target.value || undefined })
            }
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Max Stake
          </label>
          <input
            type="number"
            className="w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600"
            placeholder="10.0"
            onChange={(e) =>
              handleFilterChange({ maxStake: e.target.value || undefined })
            }
          />
        </div>
      </div>
    </div>
  );
}
