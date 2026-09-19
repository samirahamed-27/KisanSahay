import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { ApiService } from '../services/api';
import { useProfileStore } from '../store/profileStore';
import { useTTS } from '../hooks/useTTS';
import { useVoiceInput } from '../hooks/useVoiceInput';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export const AIChatScreen: React.FC = () => {
  const { profile } = useProfileStore();
  const { isSpeaking, speak, stop } = useTTS();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_welcome',
      sender: 'assistant',
      text: `राम-राम ${profile.name} जी! I am Sahay AI, your agricultural scheme & loan advisor. Ask me anything about PM-KISAN, Kisan Credit Card (KCC), crop insurance, or soil health in your language.`,
      timestamp: 'Just now',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const { isListening, startListening, stopListening } = useVoiceInput((voiceText) => {
    setInputText(voiceText);
  });

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isSending) return;

    const userMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsSending(true);

    // Call API with farmer context
    const reply = await ApiService.sendChatMessage(text, 'hi');

    const botMsg: ChatMessage = {
      id: 'msg_reply_' + Date.now(),
      sender: 'assistant',
      text: reply,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, botMsg]);
    setIsSending(false);
  };

  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const quickQuestions = [
    'How do I apply for Kisan Credit Card?',
    'PM-KISAN eligibility for small farmers?',
    'What is the interest subsidy under MISS?',
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <MaterialCommunityIcons name="robot" size={22} color="#ffffff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Sahay AI Assistant</Text>
            <Text style={styles.headerSub}>Grounded in 500+ Government Schemes</Text>
          </View>
        </View>
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        renderItem={({ item }) => {
          const isUser = item.sender === 'user';
          return (
            <View style={[styles.bubbleWrapper, isUser ? styles.userWrapper : styles.botWrapper]}>
              <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
                <Text style={[styles.bubbleText, isUser ? styles.userText : styles.botText]}>
                  {item.text}
                </Text>

                <View style={styles.bubbleFooter}>
                  <Text style={styles.timestamp}>{item.timestamp}</Text>
                  {!isUser && (
                    <TouchableOpacity
                      onPress={() => (isSpeaking ? stop() : speak(item.text, 'hi'))}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={{ marginLeft: 8 }}
                    >
                      <MaterialCommunityIcons
                        name={isSpeaking ? 'stop-circle' : 'volume-high'}
                        size={16}
                        color={Colors.primaryLight}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          );
        }}
        ListFooterComponent={
          isSending ? (
            <View style={styles.typingIndicator}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.typingText}>Sahay AI is checking scheme rules...</Text>
            </View>
          ) : null
        }
      />

      {/* Suggested Questions */}
      <View style={styles.quickQuestionsContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={quickQuestions}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.quickChip} onPress={() => handleSend(item)}>
              <Text style={styles.quickChipText}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <TouchableOpacity
          style={[styles.micButton, isListening && styles.micListening]}
          onPress={isListening ? stopListening : () => startListening('hi-IN')}
        >
          <MaterialCommunityIcons
            name={isListening ? 'stop' : 'microphone'}
            size={22}
            color="#ffffff"
          />
        </TouchableOpacity>

        <TextInput
          style={styles.textInput}
          placeholder="Ask scheme question or speak..."
          placeholderTextColor={Colors.textMuted}
          value={inputText}
          onChangeText={setInputText}
          multiline
        />

        <TouchableOpacity style={styles.sendButton} onPress={() => handleSend()}>
          <MaterialCommunityIcons name="send" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  headerSub: {
    fontSize: 11,
    color: Colors.primaryLight,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 10,
  },
  bubbleWrapper: {
    marginBottom: 12,
    flexDirection: 'row',
  },
  userWrapper: {
    justifyContent: 'flex-end',
  },
  botWrapper: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: '#ffffff',
  },
  botText: {
    color: Colors.text,
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 6,
  },
  timestamp: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  typingText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  quickQuestionsContainer: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  quickChip: {
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickChipText: {
    fontSize: 12,
    color: Colors.primaryLight,
    fontWeight: '500',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 8,
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micListening: {
    backgroundColor: Colors.danger,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: Colors.text,
    fontSize: 14,
    maxHeight: 90,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
