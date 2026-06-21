import React from 'react';

const MobileBlock = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-white">Desktop Only</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          This application is only supported on desktop devices. Please open it from a desktop or laptop browser.
        </p>
        {/* <p className="text-xs text-gray-500 dark:text-gray-400">
          If you need to test on a mobile device, add <code>?desktop=1</code> to the URL to temporarily bypass this block.
        </p> */}
      </div>
    </div>
  );
};

export default MobileBlock;
