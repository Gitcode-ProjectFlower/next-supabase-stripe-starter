'use client';

import { Plus, X } from 'lucide-react';
import React, { useState } from 'react';

import { TreeMultiSelect } from '@/components/selection/tree-multi-select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getRegionsTree, getSectorsTree } from '@/data/tree-loader';
import { getTopKLimit, type UserPlan } from '@/libs/plan-config';

interface FilterSidebarProps {
  names: string[];
  setNames: (names: string[]) => void;
  sectors: Set<string>;
  setSectors: (sectors: Set<string>) => void;
  regions: Set<string>;
  setRegions: (regions: Set<string>) => void;
  companySize: string[];
  setCompanySize: (companySize: string[]) => void;
  topK: number;
  setTopK: (topK: number) => void;
  onSearch: () => void;
  isLoading: boolean;
  resultsCount: number;
  userPlan?: UserPlan | null;
  locale?: string;
}

const COMPANY_SIZE_OPTIONS = ['0-9', '10-49', '50-249', '+250'];

export function FilterSidebar({
  names,
  setNames,
  sectors,
  setSectors,
  regions,
  setRegions,
  companySize,
  setCompanySize,
  topK,
  setTopK,
  onSearch,
  isLoading,
  resultsCount,
  userPlan,
  locale = 'uk',
}: FilterSidebarProps) {
  const [nameInput, setNameInput] = useState('');
  const [localTopK, setLocalTopK] = useState(topK.toString());

  // Get locale-specific trees
  const sectorsTree = getSectorsTree(locale);
  const regionsTree = getRegionsTree(locale);

  // Get plan limit for Top-K
  const planLimit = getTopKLimit(userPlan || 'anonymous');
  const planName =
    userPlan === 'anonymous' || !userPlan
      ? 'Anonymous'
      : userPlan === 'free_tier'
      ? 'Free'
      : userPlan === 'small'
      ? 'Small'
      : userPlan === 'medium'
      ? 'Medium'
      : userPlan === 'large'
      ? 'Large'
      : userPlan === 'promo_medium'
      ? 'Promo Medium'
      : 'Free';

  React.useEffect(() => {
    setLocalTopK(topK.toString());
  }, [topK]);

  React.useEffect(() => {
    // When plan changes, lift the default topK up to the allowed cap instead of sticking at 3.
    if (topK < planLimit) {
      setTopK(planLimit);
      setLocalTopK(planLimit.toString());
    }
  }, [planLimit]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddName = () => {
    if (nameInput.trim() && names.length < 4) {
      setNames([...names, nameInput.trim()]);
      setNameInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddName();
    }
  };

  const removeName = (index: number) => {
    setNames(names.filter((_, i) => i !== index));
  };

  const toggleCompanySize = (value: string) => {
    if (companySize.includes(value)) {
      setCompanySize(companySize.filter((size) => size !== value));
    } else {
      setCompanySize([...companySize, value]);
    }
  };

  return (
    <div className='space-y-6'>
      <div className='rounded-2xl border bg-white p-4 shadow-sm'>
        <h3 className='mb-2 text-sm font-semibold uppercase tracking-wide text-gray-700'>Input</h3>

        {/* Names */}
        <label className='text-sm text-gray-600'>Names (press Enter to add)</label>
        <div className='mt-2 flex gap-2 overflow-x-auto whitespace-nowrap pb-1'>
          {names.map((name, idx) => (
            <Badge
              key={idx}
              variant='secondary'
              className='inline-flex items-center gap-2 border bg-white px-3 py-1 text-sm font-normal shadow-sm'
            >
              {name}
              <button
                onClick={() => removeName(idx)}
                className='rounded-full p-0.5 transition-colors hover:bg-gray-100'
              >
                <X className='h-3 w-3' />
              </button>
            </Badge>
          ))}
        </div>
        <div className='mt-2 flex items-center gap-2'>
          <Input
            placeholder={names.length >= 4 ? 'Max 4 names' : 'e.g. Jordan Lee'}
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={names.length >= 4}
          />
          <Button
            variant='outline'
            size='icon'
            onClick={handleAddName}
            disabled={names.length >= 4 || !nameInput.trim()}
            className='shrink-0 bg-white'
          >
            <Plus className='h-4 w-4' />
          </Button>
        </div>

        {/* Sector */}
        <div className='relative mt-4'>
          <label className='mb-1 block text-sm text-gray-600'>Sector</label>
          <TreeMultiSelect
            data={sectorsTree}
            selected={sectors}
            onChange={setSectors}
            placeholder='Select sectors...'
          />
        </div>

        {/* Region */}
        <div className='relative mt-4'>
          <label className='mb-1 block text-sm text-gray-600'>Region</label>
          <TreeMultiSelect
            data={regionsTree}
            selected={regions}
            onChange={setRegions}
            placeholder='Select regions...'
          />
        </div>

        {/* Company Size */}
        <div className='mt-4'>
          <label className='mb-1 block text-sm text-gray-600'>Company Size</label>
          <div className='flex flex-wrap gap-2'>
            {COMPANY_SIZE_OPTIONS.map((size) => (
              <button
                key={size}
                onClick={() => toggleCompanySize(size)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  companySize.includes(size)
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Top-K */}
        <div className='mt-4'>
          <label className='mb-1 block text-sm text-gray-600'>Number of results (Top-K)</label>
          <Input
            type='number'
            min='1'
            max={planLimit}
            value={localTopK}
            onChange={(e) => {
              setLocalTopK(e.target.value);
              const val = parseInt(e.target.value);
              if (!isNaN(val) && val >= 1 && val <= planLimit) {
                setTopK(val);
              }
            }}
            onBlur={() => {
              const val = parseInt(localTopK);
              if (isNaN(val) || val < 1) {
                const defaultValue = Math.min(planLimit, 100);
                setLocalTopK(defaultValue.toString());
                setTopK(defaultValue);
              } else if (val > planLimit) {
                setLocalTopK(planLimit.toString());
                setTopK(planLimit);
              } else {
                // Ensure format matches (e.g. remove leading zeros)
                setLocalTopK(val.toString());
                setTopK(val);
              }
            }}
            placeholder={planLimit.toString()}
            className='w-full'
          />
          <p className='mt-1 text-xs text-gray-500'>
            Plan cap: <span className='font-semibold'>{planLimit}</span> ({planName} plan)
            {userPlan === 'anonymous' || !userPlan ? (
              <span className='ml-1 text-blue-600'>• Sign up to increase limit</span>
            ) : null}
          </p>
        </div>

        {/* CTA */}
        <div className='mt-4 flex items-center gap-2'>
          <Button
            className='w-full justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700'
            onClick={onSearch}
            disabled={isLoading}
          >
            {isLoading ? 'Searching...' : names.length > 0 ? 'Find lookalikes' : 'Search candidates'}
          </Button>
          {resultsCount > 0 && (
            <span className='whitespace-nowrap rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700'>
              {resultsCount} candidates
            </span>
          )}
        </div>
      </div>

      <div className='rounded-2xl border bg-white p-4 shadow-sm'>
        <h3 className='mb-2 text-sm font-semibold uppercase tracking-wide text-gray-700'>Info</h3>
        <ul className='ml-4 list-disc space-y-1 text-sm text-gray-600'>
          <li>
            Sector labels are <b>country-specific</b>.
          </li>
          <li>
            Lookalikes are sorted by <b>fit score</b>.
          </li>
          <li>Export to CSV with one click.</li>
        </ul>
      </div>
    </div>
  );
}
