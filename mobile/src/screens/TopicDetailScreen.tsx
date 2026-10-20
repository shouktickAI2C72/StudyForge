import React from 'react';
import { SafeAreaView, ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import { GlassCard } from '../components/GlassCard';
import { ConfidenceBar, EffortTierBadge, PageHeader, formatHours } from '../components/StudyUI';
import { MobilePredictResponse } from '../services/api';
import { RelatedLectures } from '../components/RelatedLectures';

export const TopicDetailScreen: React.FC<{ topic: MobilePredictResponse; onBack: () => void }> = ({ topic, onBack }) => (
  <SafeAreaView style={styles.safe}>
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <TouchableOpacity accessibilityRole="button" onPress={onBack} style={styles.back}>
        <Text style={styles.backText}>← Back to plan</Text>
      </TouchableOpacity>
      <PageHeader
        eyebrow="TOPIC ESTIMATE"
        title={topic.topic_name}
        description="An estimate based on the details extracted from your study material."
      />
      <GlassCard>
        <View style={styles.hero}>
          <Text style={styles.hours}>{topic.formatted_time}</Text>
          <EffortTierBadge tier={topic.difficulty_tier} />
        </View>
        <Text style={styles.hoursCaption}>{formatHours(topic.predicted_hours)} estimated study time</Text>
        <View style={styles.divider} />
        <ConfidenceBar value={topic.confidence_score} />
      </GlassCard>

      <Text style={styles.section}>WHAT INFORMED THIS ESTIMATE</Text>
      <GlassCard style={styles.detail}>
        <Detail label="Topic depth" value={`${topic.subtopic_count} subtopics found`} />
        <Detail label="Content style" value={topic.topic_type} />
        <Detail label="Description length" value={`${topic.desc_word_count} words`} />
      </GlassCard>

      {/* YouTube Lecture Recommendations */}
      <RelatedLectures topic={topic.topic_name} />

      <Text style={styles.note}>Estimates are predictions and may not match your actual pace.</Text>
    </ScrollView>
  </SafeAreaView>
);

const Detail = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  page: { padding: 20, paddingBottom: 110 },
  back: { minHeight: 42, justifyContent: 'center', alignSelf: 'flex-start', marginBottom: 8 },
  backText: { color: colors.orange, fontWeight: '800', fontSize: 13 },
  hero: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  hours: { color: colors.ink, fontSize: 30, fontWeight: '800', letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  hoursCaption: { color: colors.muted, fontSize: 13, marginTop: 3 },
  divider: { height: 1, backgroundColor: colors.lineSoft, marginVertical: 18 },
  section: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 0.7, marginTop: 24, marginBottom: 8 },
  detail: { paddingVertical: 4 },
  detailRow: { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  detailLabel: { color: colors.muted, fontSize: 12 },
  detailValue: { color: colors.ink, fontSize: 14, fontWeight: '700', marginTop: 4, textTransform: 'capitalize' },
  note: { color: colors.quiet, fontSize: 12, lineHeight: 18, marginTop: 16 },
});
