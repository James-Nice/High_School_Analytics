#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const path = require('path');

console.log('🚀 启动高中教学质量数据运营分析平台...');

// 检查并释放指定端口
function checkAndReleasePort(port) {
  return new Promise((resolve) => {
    console.log(`🔍 检查端口${port}是否被占用...`);
    
    const isWindows = process.platform === 'win32';
    
    if (isWindows) {
      // Windows系统：查找占用指定端口的进程
      exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
        if (error || !stdout) {
          console.log(`✅ 端口${port}未被占用`);
          resolve();
          return;
        }
        
        // 解析netstat输出，获取PID
        const lines = stdout.split('\n');
        const pids = new Set();
        
        lines.forEach(line => {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 5) {
            const pid = parts[parts.length - 1];
            if (pid && !isNaN(pid) && pid !== '0') {
              pids.add(pid);
            }
          }
        });
        
        if (pids.size === 0) {
          console.log(`✅ 端口${port}未被占用`);
          resolve();
          return;
        }
        
        console.log(`⚠️  发现端口${port}被占用，正在释放...`);
        
        // 终止所有占用指定端口的进程
        pids.forEach(pid => {
          exec(`taskkill /PID ${pid} /F`, (error) => {
            if (!error) {
              console.log(`✅ 已终止进程 PID: ${pid}`);
            }
          });
        });
        
        // 等待一段时间确保端口释放
        setTimeout(() => {
          console.log(`✅ 已释放端口${port}，共终止 ${pids.size} 个进程`);
          resolve();
        }, 2000);
      });
    } else {
      // Linux/Mac系统：查找占用指定端口的进程
      exec(`lsof -ti:${port}`, (error, stdout) => {
        if (error || !stdout) {
          console.log(`✅ 端口${port}未被占用`);
          resolve();
          return;
        }
        
        const pids = stdout.trim().split('\n');
        console.log(`⚠️  发现端口${port}被占用，正在释放...`);
        
        // 终止所有占用指定端口的进程
        pids.forEach(pid => {
          if (pid) {
            exec(`kill -9 ${pid}`, (error) => {
              if (!error) {
                console.log(`✅ 已终止进程 PID: ${pid}`);
              }
            });
          }
        });
        
        // 等待一段时间确保端口释放
        setTimeout(() => {
          console.log(`✅ 已释放端口${port}，共终止 ${pids.length} 个进程`);
          resolve();
        }, 2000);
      });
    }
  });
}

// 启动后端服务
function startBackend() {
  console.log('📡 启动后端服务...');
  const backendProcess = spawn('node', ['server.js'], {
    cwd: path.join(__dirname, 'backend'),
    env: { ...process.env, NODE_ENV: 'development' }
  });

  backendProcess.stdout.on('data', (data) => {
    console.log(`后端: ${data.toString().trim()}`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`后端错误: ${data.toString().trim()}`);
  });

  backendProcess.on('close', (code) => {
    console.log(`后端服务退出，代码: ${code}`);
  });

  return backendProcess;
}

// 启动前端服务
function startFrontend() {
  console.log('🎨 启动前端服务...');

  const isWindows = process.platform === 'win32';
  const command = isWindows ? 'npm.cmd' : 'npm';

  const frontendProcess = spawn(command, ['start'], {
    cwd: path.join(__dirname, 'frontend'),
    env: { ...process.env, PORT: 4000 },
    shell: true
  });

  frontendProcess.stdout.on('data', (data) => {
    console.log(`前端: ${data.toString().trim()}`);
  });

  frontendProcess.stderr.on('data', (data) => {
    console.error(`前端错误: ${data.toString().trim()}`);
  });

  frontendProcess.on('close', (code) => {
    console.log(`前端服务退出，代码: ${code}`);
  });

  frontendProcess.on('error', (err) => {
    console.error(`前端启动失败: ${err.message}`);
    console.log('请手动启动前端：cd frontend && npm start');
  });

  return frontendProcess;
}

// 主函数
async function main() {
  // 检查并释放端口4000和5000
  await checkAndReleasePort(4000);
  await checkAndReleasePort(5000);
  
  // 启动后端服务
  const backendProcess = startBackend();
  
  // 启动前端服务
  let frontendProcess;
  setTimeout(() => {
    frontendProcess = startFrontend();
  }, 2000);

  console.log('✨ 平台启动完成！');
  console.log('🌐 前端地址: http://localhost:4000');
  console.log('🔧 后端地址: http://localhost:5000');
  console.log('📝 默认管理员: admin/admin123');

  // 优雅退出
  process.on('SIGINT', () => {
    console.log('🛑 正在关闭服务...');
    
    // 终止后端进程
    if (backendProcess) {
      backendProcess.kill();
      console.log('✅ 后端服务已停止');
    }
    
    // 终止前端进程
    if (frontendProcess) {
      frontendProcess.kill();
      console.log('✅ 前端服务已停止');
    }
    
    // 在Windows系统上，确保端口被释放
    if (process.platform === 'win32') {
      exec('for /f "tokens=5" %a in (\'netstat -ano ^| findstr :4000\') do taskkill /PID %a /F', (error) => {
        if (!error) {
          console.log('✅ 端口4000已释放');
        }
        
        exec('for /f "tokens=5" %a in (\'netstat -ano ^| findstr :5000\') do taskkill /PID %a /F', (error) => {
          if (!error) {
            console.log('✅ 端口5000已释放');
          }
          process.exit(0);
        });
      });
    } else {
      // 在Linux/Mac系统上，确保端口被释放
      exec('lsof -ti:4000 | xargs kill -9 2>/dev/null', (error) => {
        if (!error) {
          console.log('✅ 端口4000已释放');
        }
        
        exec('lsof -ti:5000 | xargs kill -9 2>/dev/null', (error) => {
          if (!error) {
            console.log('✅ 端口5000已释放');
          }
          process.exit(0);
        });
      });
    }
  });

  // 处理进程退出事件
  process.on('exit', () => {
    console.log('👋 服务已完全退出');
  });
}

// 运行主函数
main().catch(err => {
  console.error('启动失败:', err);
  process.exit(1);
});
