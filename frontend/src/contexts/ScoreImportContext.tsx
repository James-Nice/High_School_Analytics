import React, { createContext, useState, useContext, ReactNode } from 'react';
import { message } from 'antd';

interface ScoreImportContextType {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  examList: any[];
  setExamList: (examList: any[]) => void;
  selectedExam: number | null;
  setSelectedExam: (selectedExam: number | null) => void;
  templateType: string | undefined;
  setTemplateType: (type: string | undefined) => void;
  uploadedFile: any;
  setUploadedFile: (uploadedFile: any) => void;
  importResult: any;
  setImportResult: (importResult: any) => void;
  scoreList: any[];
  setScoreList: (scoreList: any[]) => void;
  pagination: any;
  setPagination: (pagination: any) => void;
  scoreListLoading: boolean;
  setScoreListLoading: (loading: boolean) => void;
  isVerifyingData: boolean;
  setIsVerifyingData: (verifying: boolean) => void;
  importSuccessCount: number;
  setImportSuccessCount: (count: number) => void;
  currentLoadedCount: number;
  setCurrentLoadedCount: (count: number) => void;
  uploadFiles: any[];
  setUploadFiles: (files: any[]) => void;
  fetchUploadFiles: () => void;
  deleteUploadFile: (filename: string) => Promise<void>;
  fetchScoreList: (page?: number, pageSize?: number, showSuccessMessage?: boolean, currentImportSuccessCount?: number) => void;
  clearAllData: () => void;
  calculateRanks: () => void;
  handleUpload: () => void;
  downloadTemplate: () => void;
  fetchExamList: () => void;
}

const ScoreImportContext = createContext<ScoreImportContextType | undefined>(undefined);

export const useScoreImport = () => {
  const context = useContext(ScoreImportContext);
  if (!context) {
    throw new Error('useScoreImport must be used within a ScoreImportProvider');
  }
  return context;
};

interface ScoreImportProviderProps {
  children: ReactNode;
}

export const ScoreImportProvider: React.FC<ScoreImportProviderProps> = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [examList, setExamList] = useState<any[]>([]);
  const [selectedExam, setSelectedExam] = useState<number | null>(null);
  const [templateType, setTemplateType] = useState<string | undefined>(undefined);
  const [uploadedFile, setUploadedFile] = useState<any>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [scoreList, setScoreList] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>({
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0
  });
  const [scoreListLoading, setScoreListLoading] = useState(false);
  const [isVerifyingData, setIsVerifyingData] = useState(false);
  const [importSuccessCount, setImportSuccessCount] = useState(0);
  const [currentLoadedCount, setCurrentLoadedCount] = useState(0);
  const [uploadFiles, setUploadFiles] = useState<any[]>([]);

  const fetchExamList = async () => {
    try {
      const response = await fetch('/api/exams');
      const data = await response.json();
      setExamList(data);
    } catch (error) {
      console.error('获取考试列表失败:', error);
      message.error('获取考试列表失败');
    }
  };

  const downloadTemplate = async () => {
    if (!templateType) {
      message.error('请选择成绩模板类型');
      return;
    }
    
    try {
      const response = await fetch(`/api/scores/template?type=${templateType}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // 根据模板类型设置不同的文件名
      let fileName = '成绩导入模板.xlsx';
      switch (templateType) {
        case 'full':
          fileName = '高一全科成绩导入模板.xlsx';
          break;
        case 'science':
          fileName = '高中理综成绩导入模板.xlsx';
          break;
        case 'arts':
          fileName = '高中文综成绩导入模板.xlsx';
          break;
        case 'middle':
          fileName = '中考成绩导入模板.xlsx';
          break;
      }
      
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(url);
      message.success('模板下载成功！');
    } catch (error) {
      console.error('模板下载失败:', error);
      message.error('模板下载失败');
    }
  };

  const handleUpload = async () => {
    if (!uploadedFile || !selectedExam || !templateType) {
      message.error('请选择考试、上传文件并选择成绩模板类型');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', uploadedFile);
    formData.append('exam_id', selectedExam.toString());
    formData.append('template_type', templateType);

    try {
      const response = await fetch('/api/scores/import', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      setImportResult(data);
      message.success(data.message);

      if (data.error_file) {
        const errorLink = document.createElement('a');
        errorLink.href = `/uploads/${data.error_file}`;
        errorLink.download = '错误报告.xlsx';
        errorLink.click();
      }

      // 提取成功导入的记录数
      const successCountMatch = data.message.match(/成功导入(\d+)条记录/);
      if (successCountMatch) {
        setImportSuccessCount(parseInt(successCountMatch[1]));
      } else {
        setImportSuccessCount(0);
      }

      // 导入成功后自动刷新成绩列表
      fetchScoreList();
      // 导入成功后清除文件，使按钮保持禁用直到用户重新选择文件
      setUploadedFile(null);
    } catch (error: any) {
      console.error('导入失败:', error);
      message.error('导入失败');
    } finally {
      setLoading(false);
    }
  };

  const calculateRanks = async () => {
    if (!selectedExam) {
      message.error('请先选择考试');
      return;
    }

    try {
      await fetch(`/api/scores/calculate-rank/${selectedExam}`, {
        method: 'POST',
      });
      message.success('排名计算成功');
      // 刷新成绩列表但不显示额外提示
      await fetchScoreList(1, 10, false);
    } catch (error) {
      console.error('排名计算失败:', error);
      message.error('排名计算失败');
    }
  };

  const fetchScoreList = async (page = 1, pageSize = 10, showSuccessMessage = true, currentImportSuccessCount = importSuccessCount) => {
    if (!selectedExam) {
      message.error('请先选择考试');
      return;
    }

    setScoreListLoading(true);
    setIsVerifyingData(true);
    
    try {
      // 第一次获取数据
      const response = await fetch(`/api/scores?exam_id=${selectedExam}&page=${page}&pageSize=${pageSize}`);
      const data = await response.json();
      
      // 解析subject_scores并展开为独立属性
      const processedData = (data.data || []).map((row: any) => {
        const processedRow = { ...row };
        try {
          // 尝试从后端返回的科目分数中获取
          if (row.语文) {
            // 后端已经解析了，直接使用
            return processedRow;
          } else if (row.subject_scores) {
            // 后端返回了原始的subject_scores，需要前端解析
            const subjectScores = JSON.parse(row.subject_scores);
            Object.assign(processedRow, subjectScores);
          }
        } catch (e) {
          console.error('解析subject_scores失败:', e);
        }
        return processedRow;
      });
      
      const totalRecords = data.pagination?.total || 0;
      setCurrentLoadedCount(totalRecords);
      
      setScoreList(processedData);
      setPagination(data.pagination || {
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0
      });
      
      // 验证数据量是否与导入成功记录数一致
      if (currentImportSuccessCount > 0 && totalRecords !== currentImportSuccessCount) {
        // 数据量不一致，等待一段时间后重新获取
        await new Promise(resolve => setTimeout(resolve, 1000));
        // 重新获取数据
        await fetchScoreList(page, pageSize, showSuccessMessage, currentImportSuccessCount);
      } else if (currentImportSuccessCount > 0 && totalRecords === currentImportSuccessCount && showSuccessMessage) {
        // 数据量一致，显示成功提示
        message.success(`数据加载完成，共导入${currentImportSuccessCount}条记录`);
      }
    } catch (error) {
      console.error('获取成绩列表失败:', error);
      message.error('获取成绩列表失败');
      setScoreList([]);
      setPagination({
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0
      });
      setCurrentLoadedCount(0);
    } finally {
      setScoreListLoading(false);
      setIsVerifyingData(false);
    }
  };

  const clearAllData = async () => {
    try {
      await fetch('/api/scores/clear', {
        method: 'DELETE',
      });
      message.success('数据清空成功');
      setScoreList([]);
      setImportResult(null);
      setImportSuccessCount(0);
    } catch (error) {
      console.error('清空数据失败:', error);
      message.error('清空数据失败');
    }
  };

  const fetchUploadFiles = async () => {
    try {
      // 使用相对路径，避免硬编码地址
      const response = await fetch('/api/scores/uploads');
      const data = await response.json();
      setUploadFiles(data);
    } catch (error) {
      console.error('获取上传文件列表失败:', error);
      message.error('获取上传文件列表失败');
    }
  };

  const deleteUploadFile = async (filename: string) => {
    try {
      // 对文件名进行编码，处理中文编码问题
      const encodedFilename = encodeURIComponent(filename);
      // 使用相对路径，避免硬编码地址
      await fetch(`/api/scores/uploads/${encodedFilename}`, {
        method: 'DELETE',
      });
      message.success('文件和成绩数据删除成功');
      // 重置相关状态，避免数据量验证的无限循环
      setImportSuccessCount(0);
      setCurrentLoadedCount(0);
      // 重新获取文件列表
      fetchUploadFiles();
      // 只有当选择了考试时才重新获取成绩列表
      if (selectedExam) {
        fetchScoreList(1, 10, true, 0);
      }
    } catch (error) {
      console.error('删除文件失败:', error);
      message.error('删除文件失败');
    }
  };

  return (
    <ScoreImportContext.Provider
      value={{
        loading,
        setLoading,
        examList,
        setExamList,
        selectedExam,
        setSelectedExam,
        templateType,
        setTemplateType,
        uploadedFile,
        setUploadedFile,
        importResult,
        setImportResult,
        scoreList,
        setScoreList,
        pagination,
        setPagination,
        scoreListLoading,
        setScoreListLoading,
        isVerifyingData,
        setIsVerifyingData,
        importSuccessCount,
        setImportSuccessCount,
        currentLoadedCount,
        setCurrentLoadedCount,
        uploadFiles,
        setUploadFiles,
        fetchUploadFiles,
        deleteUploadFile,
        fetchScoreList,
        clearAllData,
        calculateRanks,
        handleUpload,
        downloadTemplate,
        fetchExamList,
      }}
    >
      {children}
    </ScoreImportContext.Provider>
  );
};
