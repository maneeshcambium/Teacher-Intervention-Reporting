"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { Roster, TestGroup, Test } from "@/types";

interface AppContextValue {
  // State
  rosters: Roster[];
  testGroups: TestGroup[];
  tests: Test[];
  selectedRosterId: number | null;
  selectedTestGroupId: number | null;
  selectedTestId: number | null;
  isLoading: boolean;

  // Setters
  setSelectedRosterId: (id: number | null) => void;
  setSelectedTestGroupId: (id: number | null) => void;
  setSelectedTestId: (id: number | null) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppContextProvider({ children }: { children: React.ReactNode }) {
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [testGroups, setTestGroups] = useState<TestGroup[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedRosterId, setSelectedRosterId] = useState<number | null>(null);
  const [selectedTestGroupId, setSelectedTestGroupId] = useState<number | null>(null);
  const [selectedTestId, setSelectedTestId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch rosters and test groups on mount
  useEffect(() => {
    async function init() {
      try {
        const [rostersRes, groupsRes] = await Promise.all([
          fetch("/api/rosters"),
          fetch("/api/test-groups"),
        ]);
        const rostersData: Roster[] = await rostersRes.json();
        const groupsData: TestGroup[] = await groupsRes.json();

        setRosters(rostersData);
        setTestGroups(groupsData);

        if (rostersData.length > 0) {
          setSelectedRosterId(rostersData[0].id);
        }
        if (groupsData.length > 0) {
          setSelectedTestGroupId(groupsData[0].id);
        }
      } catch (error) {
        console.error("Failed to initialize app context:", error);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  // Fetch tests when test group changes
  useEffect(() => {
    if (!selectedTestGroupId) {
      setTests([]);
      setSelectedTestId(null);
      return;
    }

    async function fetchTests() {
      try {
        const res = await fetch(`/api/test-groups/${selectedTestGroupId}/tests`);
        const data: Test[] = await res.json();
        setTests(data);
        if (data.length > 0) {
          setSelectedTestId(data[0].id);
        } else {
          setSelectedTestId(null);
        }
      } catch (error) {
        console.error("Failed to fetch tests:", error);
      }
    }
    fetchTests();
  }, [selectedTestGroupId]);

  return (
    <AppContext.Provider
      value={{
        rosters,
        testGroups,
        tests,
        selectedRosterId,
        selectedTestGroupId,
        selectedTestId,
        isLoading,
        setSelectedRosterId,
        setSelectedTestGroupId,
        setSelectedTestId,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useAppContext must be used within AppContextProvider");
  }
  return ctx;
}
