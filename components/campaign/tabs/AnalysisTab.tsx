'use client';

import React, { useState } from 'react';
import { Campaign } from '@prisma/client';

interface AnalysisResult {
  id: string;
  type: 'campaign' | 'market' | 'roadmap' | 'security' | 'features';
  title: string;
  summary: string;
  details: string;
  status: 'empty' | 'generating' | 'completed';
  generatedAt?: Date;
}

interface AnalysisTabProps {
  campaign: Campaign & {
    analysis?: {
      masterPlan?: any;
      gapAnalysis?: any;
      featureScan?: any;
      competitorResearch?: any;
      sowMarkdown?: string;
      lastAnalyzedAt?: Date;
    } | null;
  };
}

export default function AnalysisTab({ campaign }: AnalysisTabProps) {
  // Convert campaign analysis data to AnalysisResult format
  const getAnalysisResults = (): AnalysisResult[] => {
    const analysis = campaign.analysis;
    const masterPlan = analysis?.masterPlan as any;
    
    // Helper to convert nested JSON to markdown
    const jsonToMarkdown = (data: any, level: number = 2): string => {
      if (!data) return '';
      
      if (typeof data === 'string') {
        return data;
      }
      
      if (Array.isArray(data)) {
        return data.map((item, itemIndex) => {
          if (typeof item === 'string') {
            return `- ${item}`;
          } else if (typeof item === 'object') {
            // Handle milestone/roadmap objects specially
            const objectEntries = Object.entries(item);
            
            // Look for milestone-specific fields
            const hasTitle = item.title;
            const hasDescription = item.description;
            const hasAcceptance = item.acceptance;
            
            if (hasTitle && (hasDescription || hasAcceptance)) {
              // This looks like a milestone object
              let milestoneContent = `### ${itemIndex + 1}. ${hasTitle}\n\n`;
              
              if (hasDescription) {
                milestoneContent += `**Description**: ${hasDescription}\n\n`;
              }
              
              if (hasAcceptance && Array.isArray(hasAcceptance)) {
                milestoneContent += `**Acceptance Criteria**:\n`;
                milestoneContent += hasAcceptance.map(criteria => `- ${criteria}`).join('\n');
              }
              
              return milestoneContent;
            } else {
              // Generic object handling
              return `- ${JSON.stringify(item, null, 2)}`;
            }
          }
          return `- ${item}`;
        }).join('\n\n');
      }
      
      if (typeof data === 'object') {
        return Object.entries(data).map(([key, value]) => {
          const headerLevel = '#'.repeat(Math.min(level, 4));
          const title = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          
          if (typeof value === 'string') {
            return `${headerLevel} ${title}\n${value}`;
          } else if (Array.isArray(value)) {
            const listItems = value.map((item, itemIndex) => {
              if (typeof item === 'string') {
                return `- ${item}`;
              } else if (typeof item === 'object') {
                const objectEntries = Object.entries(item);
                
                // Look for a name/title property to use as the identifier
                const nameKey = objectEntries.find(([key]) => 
                  ['name', 'title', 'competitor', 'milestone'].includes(key.toLowerCase())
                )?.[0];
                
                const nameValue = nameKey ? item[nameKey] : null;
                
                if (objectEntries.length === 1) {
                  // Single property object - treat as simple item
                  const [subKey, subValue] = objectEntries[0];
                  const subTitle = subKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                  return `- **${subTitle}**: ${subValue}`;
                } else {
                  // Multi-property object - use name if available, otherwise use numbered format
                  const identifier = nameValue ? nameValue : `${itemIndex + 1}`;
                  
                  // For competitors and similar objects, use a cleaner format
                  if (nameKey) {
                    const otherEntries = objectEntries.filter(([key]) => key !== nameKey);
                    const details = otherEntries.map(([subKey, subValue]) => {
                      const subTitle = subKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                      if (typeof subValue === 'string') {
                        return `  - **${subTitle}**: ${subValue}`;
                      } else if (Array.isArray(subValue)) {
                        const subList = subValue.map(v => `    - ${v}`).join('\n');
                        return `  - **${subTitle}**:\n${subList}`;
                      }
                      return `  - **${subTitle}**: ${String(subValue)}`;
                    }).join('\n');
                    
                    return `${itemIndex + 1}. **${nameValue}**\n${details}`;
                  } else {
                    // Fallback for objects without clear names
                    const subItems = objectEntries.map(([subKey, subValue]) => {
                      const subTitle = subKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                      if (typeof subValue === 'string') {
                        return `  - **${subTitle}**: ${subValue}`;
                      } else if (Array.isArray(subValue)) {
                        const subList = subValue.map(v => `    - ${v}`).join('\n');
                        return `  - **${subTitle}**:\n${subList}`;
                      }
                      return `  - **${subTitle}**: ${String(subValue)}`;
                    }).join('\n');
                    return `${itemIndex + 1}. ${subItems}`;
                  }
                }
              }
              return `- ${item}`;
            }).join('\n\n');
            return `${headerLevel} ${title}\n${listItems}`;
          } else if (typeof value === 'object') {
            return `${headerLevel} ${title}\n${jsonToMarkdown(value, level + 1)}`;
          }
          return `${headerLevel} ${title}\n${value}`;
        }).join('\n\n');
      }
      
      return String(data);
    };

    // Helper to extract sections from masterPlan
    const getCampaignAnalysisContent = () => {
      if (!masterPlan) return '';
      
      let content = '';
      if (masterPlan.gaps) {
        content += `## Gap Analysis\n${jsonToMarkdown(masterPlan.gaps, 3)}\n\n`;
      }
      if (masterPlan.mustHaveFeatures) {
        content += `## Must Have Features\n${jsonToMarkdown(masterPlan.mustHaveFeatures, 3)}\n\n`;
      }
      if (masterPlan.niceToHaveFeatures) {
        content += `## Nice to Have Features\n${jsonToMarkdown(masterPlan.niceToHaveFeatures, 3)}\n\n`;
      }
      
      return content.trim();
    };

    const getMarketAnalysisContent = () => {
      let content = '';
      
      // Add competitor analysis from masterPlan
      if (masterPlan?.competitorAnalysis) {
        content += `## Competitor Analysis\n${jsonToMarkdown(masterPlan.competitorAnalysis, 3)}\n\n`;
      }
      
      // Add competitor research from separate field
      if (analysis?.competitorResearch) {
        content += `## Competitor Research\n${jsonToMarkdown(analysis.competitorResearch, 3)}`;
      }
      
      return content.trim();
    };

    const getRoadmapContent = () => {
      if (!masterPlan?.roadmapMilestones) return '';
      return `## Roadmap Milestones\n${jsonToMarkdown(masterPlan.roadmapMilestones, 3)}`;
    };
    
    return [
      {
        id: 'campaign',
        type: 'campaign',
        title: 'Campaign Analysis',
        summary: masterPlan ? 'Content analysis complete with gap analysis and feature recommendations.' : '',
        details: getCampaignAnalysisContent(),
        status: masterPlan ? 'completed' : 'empty',
        generatedAt: analysis?.lastAnalyzedAt || undefined
      },
      {
        id: 'market',
        type: 'market',
        title: 'Market Analysis',
        summary: (masterPlan?.competitorAnalysis || analysis?.competitorResearch) ? 'Market research and competitor analysis completed.' : '',
        details: getMarketAnalysisContent(),
        status: (masterPlan?.competitorAnalysis || analysis?.competitorResearch) ? 'completed' : 'empty',
        generatedAt: analysis?.lastAnalyzedAt || undefined
      },
      {
        id: 'roadmap',
        type: 'roadmap',
        title: 'Roadmap (Master Plan)',
        summary: masterPlan?.roadmapMilestones ? 'Development roadmap and milestones generated.' : '',
        details: getRoadmapContent(),
        status: masterPlan?.roadmapMilestones ? 'completed' : 'empty',
        generatedAt: analysis?.lastAnalyzedAt || undefined
      },
      {
        id: 'security',
        type: 'security',
        title: 'Security & Quality',
        summary: analysis?.gapAnalysis ? 'Security and quality analysis completed with recommendations.' : '',
        details: analysis?.gapAnalysis ? `## Security & Quality Analysis\n${jsonToMarkdown(analysis.gapAnalysis, 3)}` : '',
        status: analysis?.gapAnalysis ? 'completed' : 'empty',
        generatedAt: analysis?.lastAnalyzedAt || undefined
      },
      {
        id: 'features',
        type: 'features',
        title: 'Feature Presence',
        summary: analysis?.featureScan ? 'Feature presence scan completed.' : '',
        details: analysis?.featureScan ? `## Feature Presence Scan\n${jsonToMarkdown(analysis.featureScan, 3)}` : '',
        status: analysis?.featureScan ? 'completed' : 'empty',
        generatedAt: analysis?.lastAnalyzedAt || undefined
      }
    ];
  };

  const [analyses, setAnalyses] = useState<AnalysisResult[]>(getAnalysisResults());
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  const handleGenerate = async (analysisId: string) => {
    setIsGenerating(analysisId);
    
    try {
      // Call the appropriate API endpoint based on analysis type
      let endpoint = '';
      switch (analysisId) {
        case 'campaign':
        case 'roadmap':
          endpoint = '/api/campaigns/analyze/master-plan';
          break;
        case 'market':
          endpoint = '/api/campaigns/analyze/competitor-research';
          break;
        case 'security':
          endpoint = '/api/campaigns/analyze/gap-analysis';
          break;
        case 'features':
          endpoint = '/api/campaigns/analyze/feature-scan';
          break;
        default:
          throw new Error('Unknown analysis type');
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          campaignId: campaign.id,
          repoUrl: campaign.repoUrl 
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate analysis');
      }

      // Refresh the analyses data after generation
      // In a real app, you might want to refetch the campaign data
      window.location.reload();
      
    } catch (error) {
      console.error('Analysis generation error:', error);
      // You might want to show an error message here
    } finally {
      setIsGenerating(null);
    }
  };

  const handleExpand = (analysisId: string) => {
    setExpandedCard(expandedCard === analysisId ? null : analysisId);
  };

  // Helper function to render markdown tables
  const renderTable = (tableLines: string[], key: string) => {
    if (tableLines.length < 2) return null;
    
    const rows = tableLines.map(line => 
      line.split('|').map(cell => cell.trim()).filter(cell => cell !== '')
    );
    
    // Skip separator rows (like |---|---|)
    const dataRows = rows.filter(row => 
      !row.every(cell => cell.match(/^-+$/))
    );
    
    if (dataRows.length === 0) return null;
    
    const [headerRow, ...bodyRows] = dataRows;
    
    return (
      <div key={key} className="overflow-x-auto mb-4">
        <table className="min-w-full border border-gray-200 dark:border-gray-700 rounded-lg">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {headerRow.map((header, i) => (
                <th 
                  key={i} 
                  className="px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bodyRows.map((row, i) => (
              <tr key={i} className="even:bg-gray-50 dark:even:bg-gray-800">
                {row.map((cell, j) => (
                  <td 
                    key={j} 
                    className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Simple markdown-like renderer for analysis content
  const renderMarkdown = (content: string) => {
    if (!content) return null;
    
    // If it's JSON, try to format it nicely
    if (content.startsWith('{') || content.startsWith('[')) {
      try {
        const parsed = JSON.parse(content);
        return (
          <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-auto">
            <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
              {JSON.stringify(parsed, null, 2)}
            </pre>
          </div>
        );
      } catch {
        // If parsing fails, treat as regular text
      }
    }

    // Helper function to format text with bold and italic
    const formatText = (text: string) => {
      const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_)/);
      return parts.map((part, partIndex) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={partIndex} className="font-semibold text-gray-900 dark:text-white">
              {part.slice(2, -2)}
            </strong>
          );
        } else if (part.startsWith('_') && part.endsWith('_')) {
          return (
            <em key={partIndex} className="italic">
              {part.slice(1, -1)}
            </em>
          );
        } else {
          return part;
        }
      });
    };

    // Simple markdown parsing
    const lines = content.split('\n');
    const elements: React.ReactElement[] = [];

    // Handle markdown tables
    const tableLines: string[] = [];
    let inTable = false;
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      // Check if this is a table row
      if (trimmed.includes('|') && (trimmed.startsWith('|') || trimmed.split('|').length > 2)) {
        tableLines.push(line);
        inTable = true;
        return;
      } else if (inTable && tableLines.length > 0) {
        // End of table, render it
        const tableElement = renderTable(tableLines, `table-${index}`);
        if (tableElement) {
          elements.push(tableElement);
        }
        tableLines.length = 0;
        inTable = false;
      }
      
      if (trimmed.startsWith('#### ')) {
        elements.push(
          <h4 key={index} className="text-base font-medium text-gray-900 dark:text-white mt-3 mb-2 first:mt-0">
            {trimmed.substring(5)}
          </h4>
        );
      } else if (trimmed.startsWith('### ')) {
        elements.push(
          <h3 key={index} className="text-lg font-medium text-gray-900 dark:text-white mt-4 mb-2 first:mt-0">
            {trimmed.substring(4)}
          </h3>
        );
      } else if (trimmed.startsWith('## ')) {
        elements.push(
          <h2 key={index} className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3 first:mt-0">
            {trimmed.substring(3)}
          </h2>
        );
      } else if (trimmed.startsWith('# ')) {
        elements.push(
          <h1 key={index} className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4 first:mt-0">
            {trimmed.substring(2)}
          </h1>
        );
      } else if (line.match(/^    - /)) {
        // Double indented bullet point
        const content = line.replace(/^    - /, '');
        elements.push(
          <li key={index} className="text-gray-700 dark:text-gray-300 ml-14 mb-1 list-disc">
            {formatText(content)}
          </li>
        );
      } else if (line.match(/^  - /)) {
        // Indented bullet point
        const content = line.replace(/^  - /, '');
        elements.push(
          <li key={index} className="text-gray-700 dark:text-gray-300 ml-10 mb-1 list-disc">
            {formatText(content)}
          </li>
        );
      } else if (trimmed.startsWith('- ')) {
        elements.push(
          <li key={index} className="text-gray-700 dark:text-gray-300 ml-6 mb-1 list-disc">
            {formatText(trimmed.substring(2))}
          </li>
        );
      } else if (trimmed.match(/^\d+\.\s/)) {
        const content = trimmed.replace(/^\d+\.\s/, '');
        elements.push(
          <div key={index} className="mb-3">
            <div className="flex">
              <span className="text-gray-600 dark:text-gray-400 font-medium mr-2 flex-shrink-0">
                {trimmed.match(/^(\d+)\./)?.[1]}.
              </span>
              <div className="flex-1">
                {formatText(content)}
              </div>
            </div>
          </div>
        );
      } else if (trimmed) {
        elements.push(
          <p key={index} className="text-gray-700 dark:text-gray-300 mb-3">
            {formatText(trimmed)}
          </p>
        );
      } else {
        elements.push(<div key={index} className="mb-3" />);
      }
    });

    // Handle table at end of content
    if (inTable && tableLines.length > 0) {
      const tableElement = renderTable(tableLines, 'table-final');
      if (tableElement) {
        elements.push(tableElement);
      }
    }

    return <div className="prose prose-sm dark:prose-invert max-w-none">{elements}</div>;
  };

  const getCardConfig = (type: AnalysisResult['type']) => {
    const configs = {
      campaign: {
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
        colors: {
          bg: 'bg-blue-100 dark:bg-blue-900',
          text: 'text-blue-600 dark:text-blue-400',
          button: 'bg-blue-600 hover:bg-blue-700'
        },
        description: 'Review and enhance campaign content'
      },
      market: {
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
        ),
        colors: {
          bg: 'bg-green-100 dark:bg-green-900',
          text: 'text-green-600 dark:text-green-400',
          button: 'bg-green-600 hover:bg-green-700'
        },
        description: 'Research competitors and market positioning'
      },
      roadmap: {
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        ),
        colors: {
          bg: 'bg-purple-100 dark:bg-purple-900',
          text: 'text-purple-600 dark:text-purple-400',
          button: 'bg-purple-600 hover:bg-purple-700'
        },
        description: 'Generate comprehensive project plan'
      },
      security: {
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        ),
        colors: {
          bg: 'bg-red-100 dark:bg-red-900',
          text: 'text-red-600 dark:text-red-400',
          button: 'bg-red-600 hover:bg-red-700'
        },
        description: 'Run security and quality scans'
      },
      features: {
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        ),
        colors: {
          bg: 'bg-yellow-100 dark:bg-yellow-900',
          text: 'text-yellow-600 dark:text-yellow-400',
          button: 'bg-yellow-600 hover:bg-yellow-700'
        },
        description: 'Check which features are already implemented'
      }
    };
    return configs[type];
  };
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Analysis Hub
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Comprehensive analysis tools to plan and validate your campaign
        </p>
      </div>

      {/* Analysis Cards */}
      <div className="space-y-4">
        {analyses.map((analysis) => {
          const config = getCardConfig(analysis.type);
          const isExpanded = expandedCard === analysis.id;
          const isCurrentlyGenerating = isGenerating === analysis.id;
          
          return (
            <div 
              key={analysis.id}
              className={`bg-white dark:bg-gray-800 rounded-lg border transition-all duration-200 ${
                isExpanded 
                  ? 'border-gray-300 dark:border-gray-600 shadow-lg' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {/* Card Header */}
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1">
                    <div className={`w-10 h-10 ${config.colors.bg} rounded-lg flex items-center justify-center mr-3`}>
                      <div className={config.colors.text}>
                        {config.icon}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                          {analysis.title}
                        </h4>
                        {analysis.status === 'completed' && (
                          <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-xs font-medium">Completed</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {config.description}
                      </p>
                    </div>
                  </div>
                  
                  {/* Action Button */}
                  <div className="ml-4">
                    {analysis.status === 'empty' ? (
                      <button
                        onClick={() => handleGenerate(analysis.id)}
                        disabled={isCurrentlyGenerating}
                        className={`px-4 py-2 ${config.colors.button} text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
                      >
                        {isCurrentlyGenerating ? (
                          <>
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Generating...
                          </>
                        ) : (
                          <>Generate</>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleExpand(analysis.id)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                      >
                        {isExpanded ? 'Hide Details' : 'View Details'}
                        <svg 
                          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Summary for completed analyses */}
                {analysis.status === 'completed' && analysis.summary && !isExpanded && (
                  <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {analysis.summary}
                    </p>
                    {analysis.generatedAt && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Generated {analysis.generatedAt.toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Expanded Content */}
              {isExpanded && analysis.status === 'completed' && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-6">
                  {renderMarkdown(analysis.details)}
                  
                  {/* Action buttons in expanded view */}
                  <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      Export Results
                    </button>
                    <button 
                      onClick={() => handleGenerate(analysis.id)}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Regenerate
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
