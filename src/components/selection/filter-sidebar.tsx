'use client';

import { X } from 'lucide-react';
import React, { useRef, useState } from 'react';

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
  const [showInfoTip, setShowInfoTip] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        <h3 className='mb-2 text-sm font-semibold uppercase tracking-wide text-gray-700'>Choose your target</h3>

        {/* Names */}
        <div>
          <div className='flex items-baseline gap-1.5'>
            <label className='text-sm font-medium text-gray-700'>Find similar companies</label>
            <span className='text-xs font-normal text-[#71717A]'>(Optional)</span>
          </div>
          <p className='mt-0.5 text-xs leading-snug text-[#6B7280]'>
            Based on products, customers, and business model.{' '}
            <span
              className='relative inline-block'
              onMouseEnter={() => {
                if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                hoverTimeoutRef.current = setTimeout(() => setShowInfoTip(true), 150);
              }}
              onMouseLeave={() => {
                if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                hoverTimeoutRef.current = setTimeout(() => setShowInfoTip(false), 200);
              }}
            >
              <button
                type='button'
                onClick={() => setShowInfoTip(!showInfoTip)}
                className='text-xs text-blue-500 underline hover:text-blue-600'
              >
                How it works →
              </button>
              {showInfoTip && (
                <div className='absolute left-0 top-6 z-50 w-[420px] rounded-xl border bg-white p-5 text-sm text-gray-700 shadow-lg'>
                  <p className='mb-2 font-medium text-gray-900'>We analyze companies across:</p>
                  <div className='mb-3 space-y-1 text-gray-600'>
                    <p>– Products and services</p>
                    <p>– Target customers</p>
                    <p>– Business model and operations</p>
                  </div>
                  <p className='mb-2 text-gray-600'>
                    Powered by millions of data points, our model identifies companies that truly operate alike — beyond
                    traditional filters like industry or size.
                  </p>
                  <p className='text-gray-600'>
                    Built to deliver higher-quality matches for outreach, segmentation, and targeting.
                  </p>
                </div>
              )}
            </span>
          </p>
        </div>
        <div className='mt-2'>
          <Input
            placeholder={names.length >= 4 ? 'Max 4 names' : 'Enter a company name (e.g. santander.co.uk)'}
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (nameInput.trim()) handleAddName();
            }}
            disabled={names.length >= 4}
          />
        </div>
        {names.length > 0 && (
          <div className='mt-2 flex flex-wrap gap-2'>
            {names.map((name, idx) => (
              <Badge
                key={idx}
                variant='secondary'
                className='inline-flex items-center gap-2 border border-gray-200 bg-gray-50 px-2.5 py-1 text-sm font-normal text-gray-700 shadow-none'
              >
                {name}
                <button
                  onClick={() => removeName(idx)}
                  className='rounded-full p-0.5 text-gray-500 transition-colors hover:bg-gray-200'
                >
                  <X className='h-3 w-3' />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* Sector */}
        <div className='relative mt-4' data-filter='sector'>
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
          <div className='flex gap-1.5'>
            {COMPANY_SIZE_OPTIONS.map((size) => (
              <button
                key={size}
                onClick={() => toggleCompanySize(size)}
                className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-xs transition-colors ${companySize.includes(size)
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
              >
                {size === '+250' ? '250+' : size}
              </button>
            ))}
          </div>
        </div>

        {/* Top-K */}
        <div className='mt-4'>
          <label className='mb-1 block text-sm text-gray-600'>Number of results</label>
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
                setLocalTopK(val.toString());
                setTopK(val);
              }
            }}
            placeholder={planLimit.toString()}
            className='w-full [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
          />
          <p className='mt-1 text-xs text-gray-500'>
            Max {planLimit} results ({planName} plan)
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
            {isLoading ? 'Searching...' : 'Show companies →'}
          </Button>
          {resultsCount > 0 && (
            <span className='whitespace-nowrap rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700'>
              {resultsCount} companies
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
          <li>All selections can be downloaded as an Excel file.</li>
        </ul>
      </div>
    </div>
  );
}
