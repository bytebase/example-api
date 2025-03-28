'use client';
import { useEffect, useState } from 'react';
import { DatabaseMetadata, Table } from './types/database';
import { Classification, ClassificationLevel } from './types/classification';

export default function Home() {
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [classifications, setClassifications] = useState<Record<string, Classification>>({});
  const [classificationLevels, setClassificationLevels] = useState<ClassificationLevel[]>([]);
  const [updating, setUpdating] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const getSelectableClassifications = () => {
    return Object.values(classifications).filter(c => c.levelId);
  };

  const handleLoad = async (preserveSelection = false) => {
    try {
      setLoading(true);
      const [metadataResponse, classificationsResponse] = await Promise.all([
        fetch('/api/databasemeta'),
        fetch('/api/classifications')
      ]);

      const data: DatabaseMetadata = await metadataResponse.json();
      const classificationData: ClassificationResponse = await classificationsResponse.json();
      
      const classificationConfig = classificationData.value.dataClassificationSettingValue.configs[0];
      setClassifications(classificationConfig.classification);
      setClassificationLevels(classificationConfig.levels);
      
      const publicSchema = data.schemas.find(schema => schema.name === 'public');
      const publicSchemaConfig = data.schemaConfigs.find(config => config.name === 'public');
      
      if (publicSchema) {
        const tablesWithConfigs = publicSchema.tables.map(table => {
          const tableConfig = publicSchemaConfig?.tableConfigs.find(
            config => config.name === table.name
          );

          const columnsWithConfigs = table.columns.map(column => {
            const columnConfig = tableConfig?.columnConfigs?.find(
              config => config.name === column.name
            );
            
            return {
              ...column,
              classificationId: columnConfig?.classificationId
            };
          });

          return {
            ...table,
            columns: columnsWithConfigs,
            classificationId: tableConfig?.classificationId
          };
        });

        setTables(tablesWithConfigs);
        
        const storedTableName = localStorage.getItem('selectedTableName');
        
        if (preserveSelection && selectedTable) {
          const updatedSelectedTable = tablesWithConfigs.find(t => t.name === selectedTable.name);
          setSelectedTable(updatedSelectedTable || null);
        } else if (storedTableName) {
          const storedTable = tablesWithConfigs.find(t => t.name === storedTableName);
          setSelectedTable(storedTable || tablesWithConfigs[0]);
        } else if (tablesWithConfigs.length > 0) {
          setSelectedTable(tablesWithConfigs[0]);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      showNotification('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (tableName: string) => {
    const selected = tables.find(table => table.name === tableName);
    setSelectedTable(selected || null);
    localStorage.setItem('selectedTableName', tableName);
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000); // Hide after 3 seconds
  };

  const handleClassificationUpdate = async (
    tableName: string, 
    columnName: string | null, 
    classificationId: string
  ) => {
    try {
      setUpdating(true);
      
      // Find current table configuration
      const currentTable = tables.find(t => t.name === tableName);
      if (!currentTable) throw new Error('Table not found');

      // Get the current metadata to preserve other configurations
      const metadataResponse = await fetch('/api/databasemeta');
      const currentMetadata: DatabaseMetadata = await metadataResponse.json();
      
      // Find current schema configs
      const publicSchemaConfig = currentMetadata.schemaConfigs.find(
        config => config.name === 'public'
      );

      // Preserve existing table configurations
      const existingTableConfigs = publicSchemaConfig?.tableConfigs || [];
      
      // Create updated table config
      const updatedTableConfig = {
        name: tableName,
        columnConfigs: currentTable.columns
          .filter(col => 
            col.classificationId ||
            col.name === columnName
          )
          .map(col => ({
            name: col.name,
            classificationId: columnName === col.name ? classificationId : col.classificationId,
            semanticTypeId: '',
            labels: {}
          })),
        classificationId: columnName 
          ? currentTable.classificationId 
          : classificationId
      };

      // Merge configurations: keep all other tables and update the target table
      const mergedTableConfigs = existingTableConfigs.map(config => 
        config.name === tableName ? updatedTableConfig : config
      );

      // If the table wasn't in the existing configs, add it
      if (!existingTableConfigs.some(config => config.name === tableName)) {
        mergedTableConfigs.push(updatedTableConfig);
      }

      const updatePayload = {
        schemaConfigs: [{
          name: 'public',
          tableConfigs: mergedTableConfigs
        }]
      };

      const response = await fetch('/api/databasemeta', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload)
      });

      if (!response.ok) {
        throw new Error('Failed to update classification');
      }

      // Reload the data while preserving the selected table
      await handleLoad(true);
      showNotification(
        `Successfully updated ${columnName ? `column "${columnName}"` : 'table'} classification`,
        'success'
      );
    } catch (error) {
      console.error('Error updating classification:', error);
      showNotification(
        `Failed to update ${columnName ? `column "${columnName}"` : 'table'} classification`,
        'error'
      );
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    handleLoad();
  }, []);

  // Add function to get level title for a classification
  const getClassificationDisplay = (classification: Classification) => {
    if (!classification.levelId) return classification.title;
    
    const level = classificationLevels.find(l => l.id === classification.levelId);
    return `${classification.id} ${classification.title} ==== [${level?.title || classification.levelId}]`;
  };

  if (loading) {
    return <div className="min-h-screen p-8 text-gray-500">Loading...</div>;
  }

  return (
    <div className="min-h-screen p-8 relative">
      {notification && (
        <div
          className={`fixed top-0 left-0 right-0 p-4 text-white text-center ${
            notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } transition-all duration-300 z-50`}
        >
          {notification.message}
        </div>
      )}

      <div className="mb-8">
        <h1 className='text-3xl font-bold mb-4'>Data Classification Demo</h1>
        <label htmlFor="table-select" className="block text-sm font-medium text-gray-700 mb-2">
          Select Table
        </label>
        <select
          id="table-select"
          className="block w-full max-w-md px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          value={selectedTable?.name || ''}
          onChange={(e) => handleTableChange(e.target.value)}
        >
          {tables.map((table) => (
            <option key={table.name} value={table.name}>
              {table.name}
            </option>
          ))}
        </select>
      </div>

      {selectedTable && (
        <div className="space-y-4">
          <div className="bg-gray-100 p-4 rounded">
            <h2 className="text-xl font-semibold mb-2">Table: {selectedTable.name}</h2>
            <div className="text-gray-600 mb-4">
              {selectedTable.comment && (
                <p>Comment: {selectedTable.comment}</p>
              )}
              <div className="flex items-center gap-2">
                <span>Table Classification:</span>
                <select
                  className="px-2 py-1 border border-gray-300 rounded min-w-[300px]"
                  value={selectedTable.classificationId || ''}
                  onChange={(e) => handleClassificationUpdate(selectedTable.name, null, e.target.value)}
                  disabled={updating}
                >
                  <option value="">Not set</option>
                  {getSelectableClassifications().map((classification) => (
                    <option key={classification.id} value={classification.id}>
                      {getClassificationDisplay(classification)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Column Name
                  </th>
                  <th className="px-6 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nullable
                  </th>
                  <th className="px-6 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Classification
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {selectedTable.columns.map((column) => (
                  <tr key={column.name}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {column.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {column.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {column.nullable ? 'Yes' : 'No'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <select
                        className="px-2 py-1 border border-gray-300 rounded min-w-[300px]"
                        value={column.classificationId || ''}
                        onChange={(e) => handleClassificationUpdate(selectedTable.name, column.name, e.target.value)}
                        disabled={updating}
                      >
                        <option value="">Not set</option>
                        {getSelectableClassifications().map((classification) => (
                          <option key={classification.id} value={classification.id}>
                            {getClassificationDisplay(classification)}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
