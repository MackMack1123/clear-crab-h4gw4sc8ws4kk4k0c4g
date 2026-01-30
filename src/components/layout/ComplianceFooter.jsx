import React from 'react';

export default function ComplianceFooter() {
    return (
        <footer className="bg-gray-50 border-t border-gray-200 py-8 mt-auto">
            <div className="max-w-7xl mx-auto px-4 text-center">
                <p className="text-xs text-gray-500 max-w-3xl mx-auto leading-relaxed">
                    This platform supports private, team-managed fundraising events for youth sports organizations.
                    All contributions and distributions occur within closed groups.
                    This service does not support public raffles, gambling, or games of chance.
                </p>
                <p className="text-[10px] text-gray-400 mt-2">
                    &copy; {new Date().getFullYear()} Fundraisr Platform. All rights reserved.
                </p>
            </div>
        </footer>
    );
}
