import React from 'react';

interface FoodBadgeProps {
  isVeg: boolean | number;
  size?: 'sm' | 'md';
}

export const FoodBadge: React.FC<FoodBadgeProps> = ({ isVeg, size = 'sm' }) => {
  const isVegetarian = typeof isVeg === 'number' ? isVeg === 1 : isVeg;
  const dimensionClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const dotClass = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5';

  return (
    <div
      className={`inline-flex items-center justify-center border-2 rounded-sm p-0.5 ${dimensionClass} ${
        isVegetarian ? 'border-emerald-600' : 'border-rose-600'
      }`}
      title={isVegetarian ? 'Vegetarian' : 'Non-Vegetarian'}
    >
      <div
        className={`rounded-full ${dotClass} ${
          isVegetarian ? 'bg-emerald-600' : 'bg-rose-600'
        }`}
      />
    </div>
  );
};

export default FoodBadge;
