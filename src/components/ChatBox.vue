<template>
  <div class="chat-box">
    <div class="chat-content" ref="chatContent">
      <div v-for="(message, index) in messages" :key="index"
           :class="['chat-message', message.type === 'user' ? 'user-message' : 'ai-message']">
        <div class="message-avatar">
          <img :src="message.type === 'user' ? userAvatar : aiAvatar" alt="头像" class="avatar">
        </div>
        <div class="message-content" v-html="message.content"></div>
      </div>
    </div>
    <div v-if="recommendedQuestions.length > 0" class="recommended-questions">
      <el-button
          v-for="(question, index) in recommendedQuestions"
          :key="index"
          class="recommended-button"
          @click="setMessageAndFocus(question)"
      >
        {{ question }}
      </el-button>
    </div>
    <div class="input-container">
      <el-input
          type="textarea"
          v-model="newMessage"
          placeholder="输入您的问题..."
          class="chat-input"
          :autosize="{ minRows: 3, maxRows: 6 }"
          @keydown="handleKeydown"
      ></el-input>
      <el-button class="send-button" @click="sendMessage">
        <img src="@/assets/upload.png" alt="上传图标" class="upload-icon">
      </el-button>
    </div>
  </div>
</template>

<script>
import {callAgent} from '@/agents/index.js';
import {idbKeyval} from "@/agents/db";

export default {
  props: ['messages'],
  data() {
    return {
      newMessage: '',
      recommendedQuestions: [],
      userAvatar: require('@/assets/user-logo-2.png'),
      aiAvatar: require('@/assets/ai-logo.png')
    }
  },
  methods: {
    async sendMessage() { // 修改为异步方法
      if (this.newMessage.trim()) {
        this.addUserMessage(this.newMessage);
        const userMessage = this.newMessage; // 保存用户消息
        this.newMessage = '';
        this.scrollToBottom();

        // 调用agents流工具获取回复
        try {
          const aiResponse = await callAgent(userMessage, async (data) => {
            try{
              if (data.type === 'visualization') {
                // 更新图表
                const modify = data['modify'] || false;
                await this.$parent.updateListItems(data.visualizationSpec, data.processedData, modify);
              } else {
                // 输出解释
                await this.splitAndAddMessages(data.message);
                this.$parent.updateDescription();
                this.recommendedQuestions = await idbKeyval.get('recommended') || [];
              }
            
            } catch (error) {
              console.error('Error in streamCallback:', error);
              throw error;
            }
          });
          this.addAiMessage(aiResponse);
        } catch (error) {
          console.error('Error in sendMessage:', error);
        }
      }
    },
    setMessageAndFocus(question) {
      this.newMessage = question;
      this.recommendedQuestions = [];
    },
    addUserMessage(message) {
      this.$emit('new-message', {content: message, type: 'user'});
    },
    addAiMessage(message) {
      this.$emit('new-message', {content: message, type: 'ai'});
    },
    setMessageAndSend(message) {
      this.newMessage = message;
      this.sendMessage();
    },
    handleKeydown(event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        this.sendMessage();
        event.preventDefault(); // 阻止默认行为
      }
    },
    scrollToBottom() {
      this.$nextTick(() => {
        const chatContent = this.$refs.chatContent;
        if (chatContent && typeof chatContent.getBoundingClientRect === 'function') {
          chatContent.scrollTop = chatContent.scrollHeight;
        }
      });
    },
    async splitAndAddMessages(message) {
      const [part1, part2] = message.split('结论和见解：');
      if (part1) {
        this.addAiMessage(part1.trim());
        await this.delay(300);
      }
      if (part2) {
        this.addAiMessage(`结论和见解：${part2.trim()}`);
      }
    },
    delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  },
  watch: {
    messages() {
      this.scrollToBottom();
    }
  }
}
</script>


<style scoped>
.chat-box {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 20px solid #fdfdfd;
}

.chat-content {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 10px;
}

.chat-message {
  display: flex;
  align-items: flex-start;
  margin-bottom: 10px;
  max-width: 80%; /* 减小对话气泡的宽度 */
}

.user-message {
  flex-direction: row-reverse; /* 用户消息头像在右边，气泡在左边 */
  margin-left: auto; /* 使用户消息靠右 */
}

.user-message .message-avatar {
  margin-left: 10px;
}

.ai-message {
  flex-direction: row; /* AI消息头像在左边，气泡在右边 */
  margin-right: auto; /* 使AI消息靠左 */
}

.ai-message .message-avatar {
  margin-right: 10px;
}

.message-content {
  padding: 10px;
  background-color: #e0e0e0; /* 修改内容背景颜色以区分 */
  border-radius: 10px;
  margin: 0 10px;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}


.input-container {
  display: flex;
  align-items: flex-end; /* 确保图标在底部 */
  padding: 10px;
  background-color: #fff; /* 确保输入框背景色与页面一致 */
}

.chat-input {
  flex: 1;
}

.send-button {
  margin-left: 10px;
  margin-bottom: 5px;
  background-color: transparent; /* 背景色透明 */
  padding: 0; /* 确保按钮没有内边距 */
  display: flex;
  height: 30px;
  border: none; /* 删除边框 */
  box-shadow: none; /* 删除阴影 */
}

.send-button:focus {
  outline: none; /* 删除点击后的高亮边框 */
}

.upload-icon {
  width: 30px;
  height: 30px;
}

.recommended-questions {
  margin-top: 10px;
  display: flex;
  flex-direction: column; /* 垂直排列 */
  align-items: flex-start;
  gap: 10px;
  background-color: #fdfdfd;
}

.recommended-button {
  margin-left: 11px;
  border-radius: 20px;
  background-color: #e0e0e0;
  padding: 5px 10px;
  font-size: 14px;
  text-align: center; /* 确保按钮文本居中对齐 */
}
</style>
