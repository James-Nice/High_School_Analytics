import React, { useEffect, useState } from 'react';
import { Upload, Button, message, Card, Table, Select, Form, Row, Col, Typography, Alert, Popconfirm, Modal, Checkbox } from 'antd';
import { InboxOutlined, DownloadOutlined, UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import { useScoreImport } from '../contexts/ScoreImportContext';

const { Dragger } = Upload;
const { Title } = Typography;
const { Option } = Select;

const ScoreImport: React.FC = () => {
  const {
    loading,
    examList,
    selectedExam,
    templateType,
    setTemplateType,
    uploadedFile,
    importResult,
    scoreList,
    pagination,
    scoreListLoading,
    isVerifyingData,
    importSuccessCount,
    currentLoadedCount,
    uploadFiles,
    fetchUploadFiles,
    deleteUploadFile,
    setSelectedExam,
    setUploadedFile,
    setScoreList,
    setImportResult,
    setImportSuccessCount,
    setCurrentLoadedCount,
    setScoreListLoading,
    setIsVerifyingData,
    fetchExamList,
    downloadTemplate,
    handleUpload,
    calculateRanks,
    fetchScoreList,
    clearAllData
  } = useScoreImport();

  const [fileModalVisible, setFileModalVisible] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  useEffect(() => {
    fetchExamList();
  }, []);

  const handleClearData = async () => {
    // 先获取上传文件列表
    try {
      await fetchUploadFiles();
    } catch (error) {
      // 即使获取文件列表失败，也显示模态框
      console.error('获取文件列表失败:', error);
    }
    // 显示文件选择模态框
    setFileModalVisible(true);
  };

  const handleFileModalCancel = () => {
    setFileModalVisible(false);
    setSelectedFiles([]);
  };

  const handleFileSelectChange = (checkedValues: string[]) => {
    setSelectedFiles(checkedValues);
  };

  const handleDeleteAll = () => {
    // 显示确认对话框
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除所有上传文件和所有成绩数据吗？此操作不可恢复！',
      okText: '确认删除',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        // 先删除所有上传文件
        for (const file of uploadFiles) {
          try {
            const encodedFilename = encodeURIComponent(file.name);
            await fetch(`/api/scores/uploads/${encodedFilename}`, {
              method: 'DELETE',
            });
          } catch (error) {
            console.error('删除文件失败:', error);
            message.error('删除文件失败');
            return;
          }
        }
        
        // 然后清空数据
        try {
          await fetch('/api/scores/clear', {
            method: 'DELETE',
          });
          message.success('所有文件和成绩数据删除成功');
          // 重置相关状态，避免数据量验证的无限循环
          setImportSuccessCount(0);
          setCurrentLoadedCount(0);
          setScoreList([]);
          setImportResult(null);
        } catch (error) {
          console.error('清空数据失败:', error);
          message.error('清空数据失败');
        }
        
        // 重新获取文件列表
        fetchUploadFiles();
        // 只有当选择了考试时才重新获取成绩列表
        if (selectedExam) {
          fetchScoreList(1, 10, true, 0);
        }
        
        // 关闭模态框
        setFileModalVisible(false);
        setSelectedFiles([]);
      }
    });
  };

  const handleFileModalOk = async () => {
    // 只删除选中的文件
    for (const filename of selectedFiles) {
      // 调用删除文件的函数，但不显示每个文件的成功提示
      try {
        const encodedFilename = encodeURIComponent(filename);
        await fetch(`/api/scores/uploads/${encodedFilename}`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.error('删除文件失败:', error);
        message.error('删除文件失败');
        return;
      }
    }
    
    // 显示一个总的成功提示
    message.success('文件和成绩数据删除成功');
    // 重置相关状态，避免数据量验证的无限循环
    setImportSuccessCount(0);
    setCurrentLoadedCount(0);
    setScoreList([]);
    setImportResult(null);
    
    // 重新获取文件列表
    fetchUploadFiles();
    // 只有当选择了考试时才重新获取成绩列表
    if (selectedExam) {
      fetchScoreList(1, 10, true, 0);
    }
    
    // 关闭模态框
    setFileModalVisible(false);
    setSelectedFiles([]);
  };

  const props = {
    name: 'file',
    accept: '.xlsx,.xls',
    maxCount: 1,
    beforeUpload: (file: any) => {
      const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.type === 'application/vnd.ms-excel';
      if (!isExcel) {
        message.error('只能上传Excel文件！');
        return false;
      }
      setUploadedFile(file);
      return false; // 阻止自动上传
    },
    onRemove: () => {
      setUploadedFile(null);
    },
  };

  const columns = [
    { title: '班级', dataIndex: 'class_name', key: 'class_name' },
    { title: '学号', dataIndex: 'student_number', key: 'student_number' },
    { title: '姓名', dataIndex: 'student_name', key: 'student_name' },
    { title: '语文', dataIndex: '语文', key: '语文' },
    { title: '数学', dataIndex: '数学', key: '数学' },
    { title: '英语', dataIndex: '英语', key: '英语' },
    { title: '物理', dataIndex: '物理', key: '物理' },
    { title: '化学', dataIndex: '化学', key: '化学' },
    { title: '生物', dataIndex: '生物', key: '生物' },
    { title: '政治', dataIndex: '政治', key: '政治' },
    { title: '历史', dataIndex: '历史', key: '历史' },
    { title: '地理', dataIndex: '地理', key: '地理' },
    {
      title: '总分',
      dataIndex: 'total_score',
      key: 'total_score',
      sorter: (a: any, b: any) => a.total_score - b.total_score,
    },
    { title: '班内排名', dataIndex: 'class_rank', key: 'class_rank' },
    { title: '年级排名', dataIndex: 'grade_rank', key: 'grade_rank' },
  ];

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>成绩数据导入</Title>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card title="步骤1：选择考试">
            <Form layout="vertical">
              <Form.Item label="选择考试">
                <Select
                  placeholder="请选择要导入成绩的考试"
                  onChange={(value) => {
                    setSelectedExam(value);
                    // 重置相关状态，确保状态一致性
                    setScoreList([]);
                    setImportResult(null);
                    setImportSuccessCount(0);
                    setCurrentLoadedCount(0);
                    setUploadedFile(null);
                    setScoreListLoading(false);
                    setIsVerifyingData(false);
                  }}
                  value={selectedExam}
                >
                  {examList.map(exam => (
                    <Option key={exam.id} value={exam.id}>
                      {exam.name} ({exam.grade} - {exam.type})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item label="选择模板类型">
                <Select 
                  placeholder="请选择成绩模板类型" 
                  value={templateType || undefined} 
                  onChange={(value) => setTemplateType(value)} 
                >
                  <Option value="full">高一全科成绩导入模板</Option>
                  <Option value="science">高中理综成绩导入模板</Option>
                  <Option value="arts">高中文综成绩导入模板</Option>
                  <Option value="middle">中考成绩导入模板</Option>
                </Select>
              </Form.Item>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={downloadTemplate}
                disabled={!selectedExam}
                block
              >
                下载导入模板
              </Button>
            </Form>
          </Card>
        </Col>

        <Col span={16}>
          <Card title="步骤2：上传成绩文件">
            <Dragger {...props}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined style={{ fontSize: 48, color: '#1890ff' }} />
              </p>
              <p className="ant-upload-text">点击或拖拽Excel文件到此处上传</p>
              <p className="ant-upload-hint">
                请下载并使用标准模板格式，支持 .xlsx, .xls 格式
              </p>
            </Dragger>

            {uploadedFile && (
              <div style={{ marginTop: 16 }}>
                <Alert
                  message="已选择文件"
                  description={uploadedFile.name}
                  type="info"
                  showIcon
                />
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {importResult && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={24}>
            <Alert
              message="导入结果"
              description={
                <div>
                  <p>{importResult.message}</p>
                </div>
              }
              type={importResult.error_file ? 'warning' : 'success'}
              showIcon
            />
          </Col>
        </Row>
      )}

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card title="步骤3：执行导入">
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <Button
                type="primary"
                icon={<UploadOutlined />}
                onClick={handleUpload}
                disabled={!uploadedFile || !selectedExam}
                loading={loading}
                size="large"
              >
                开始导入数据
              </Button>

              <Button
                onClick={() => fetchScoreList()}
                disabled={!selectedExam || scoreListLoading}
                loading={scoreListLoading}
                size="large"
              >
                查看成绩列表
              </Button>

              {selectedExam && (
                <Button
                  onClick={calculateRanks}
                  disabled={scoreListLoading || scoreList.length === 0}
                  size="large"
                >
                  计算排名
                </Button>
              )}

                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleClearData}
                  size="large"
                >
                  清除数据
                </Button>
            </div>
          </Card>
        </Col>
      </Row>

      {scoreListLoading && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={24}>
            <Alert
              message={`数据正在加载中，已加载 ${currentLoadedCount} 条记录${importSuccessCount > 0 ? `，共需加载 ${importSuccessCount} 条记录` : ''}`}
              type="info"
              showIcon
            />
          </Col>
        </Row>
      )}

      {scoreList.length > 0 && (
        <Row>
          <Col span={24}>
            <Card title="成绩列表" style={{ marginTop: 24 }}>
              <Table
                columns={columns}
                dataSource={scoreList}
                rowKey="id"
                pagination={{
                  current: pagination.page,
                  pageSize: pagination.pageSize,
                  total: pagination.total,
                  pageSizeOptions: ['5', '10', '20', '50'],
                  showSizeChanger: true,
                  showTotal: (total) => `共 ${total} 条记录`,
                  onChange: (page, pageSize) => fetchScoreList(page, pageSize, false),
                  onShowSizeChange: (current, pageSize) => fetchScoreList(1, pageSize, false)
                }}
                scroll={{ x: true }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 文件删除模态框 */}
      <Modal
        title="删除历史上传文件记录"
        open={fileModalVisible}
        onOk={handleFileModalOk}
        onCancel={handleFileModalCancel}
        okText="确定删除"
        cancelText="取消"
        width={600}
        footer={[
          <Button key="cancel" onClick={handleFileModalCancel}>
            取消
          </Button>,
          <Button key="delete" type="primary" onClick={handleFileModalOk}>
            确定删除
          </Button>,
          <Button key="deleteAll" type="primary" danger onClick={handleDeleteAll}>
            确定全部删除
          </Button>
        ]}
      >
        <div style={{ marginBottom: 16 }}>
          <p>请选择要删除的上传文件记录：</p>
        </div>
        {uploadFiles.length > 0 ? (
          <Checkbox.Group
            options={uploadFiles.map(file => ({
              label: `${file.name} (${(file.size / 1024).toFixed(2)}KB)`,
              value: file.name
            }))}
            onChange={handleFileSelectChange}
            value={selectedFiles}
          />
        ) : (
          <div style={{ padding: 16, backgroundColor: '#f5f5f5', borderRadius: 4, marginBottom: 16 }}>
            <p>暂无上传文件记录</p>
          </div>
        )}
        <div style={{ marginTop: 16, color: '#666' }}>
          <p>提示：选择文件后，系统会删除选中的文件和成绩。</p>
          <p>确定全部删除：删除所有上传文件和所有成绩数据 <span style={{ color: 'red', fontWeight: 'bold' }}>（谨慎操作）</span>。</p>
        </div>
      </Modal>
    </div>
  );
};

export default ScoreImport;