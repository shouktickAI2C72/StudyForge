import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { colors } from '../theme/colors';
import {
  ConfidenceBar,
  DataSourceBadge,
  EffortTierBadge,
  ErrorState,
  PageHeader,
  formatHours,
} from '../components/StudyUI';
import {
  MobileExtractedTopic,
  MobileScanNotesResponse,
  scanPickedImage,
  scanSample,
} from '../services/notesScannerApi';
import { RelatedLectures } from '../components/RelatedLectures';

export const StudyPlanScreen: React.FC<{ onTopic: (topic: MobileExtractedTopic) => void }> = ({ onTopic }) => {
  const [plan, setPlan] = useState<MobileScanNotesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sample, setSample] = useState(false);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  const execute = async (fn: () => Promise<MobileScanNotesResponse>, isSample: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fn();
      setPlan(data);
      setSample(isSample);
    } catch (e: any) {
      setPlan(null);
      setError(e?.message || 'Could not build a study plan.');
    } finally {
      setLoading(false);
    }
  };

  const upload = async () => {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'text/plain', 'text/markdown', 'text/csv', 'image/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (picked.canceled || !picked.assets?.[0]) return;
    const file = picked.assets[0];
    execute(
      () =>
        scanPickedImage({
          uri: file.uri,
          fileName: file.name,
          mimeType: file.mimeType || 'application/octet-stream',
        }),
      false
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <PageHeader
          eyebrow="BUILD STUDY PLAN"
          title="Turn a syllabus into a plan."
          description="Upload a PDF, document, or image. We’ll extract topics and return estimates from the server."
        />

        <TouchableOpacity accessibilityRole="button" style={styles.upload} onPress={upload} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.orange} />
          ) : (
            <>
              <View style={styles.uploadMark}>
                <View style={styles.uploadLine} />
                <View style={styles.uploadLine} />
              </View>
              <Text style={styles.uploadTitle}>Upload study material</Text>
              <Text style={styles.uploadText}>PDF, text document, or image · up to 15 MB</Text>
              <Text style={styles.uploadAction}>Choose a file</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.sampleRow}>
          <Text style={styles.sampleText}>Want to explore first?</Text>
          <TouchableOpacity
            accessibilityRole="button"
            disabled={loading}
            onPress={() => execute(() => scanSample('ds_notes.png'), true)}
          >
            <Text style={styles.sampleAction}>Try a Sample</Text>
          </TouchableOpacity>
        </View>

        {error && <ErrorState message={`Plan couldn’t be created: ${error}`} retry={upload} />}

        {plan && (
          <>
            <View style={styles.summary}>
              <View style={styles.summaryTop}>
                <View>
                  <Text style={styles.kicker}>ESTIMATED STUDY TIME</Text>
                  <Text style={styles.total}>{formatHours(plan.total_estimated_hours)}</Text>
                  <Text style={styles.totalSub}>
                    {plan.total_topics_detected} topics extracted from {plan.filename}
                  </Text>
                </View>
                <DataSourceBadge sample={sample} />
              </View>
            </View>

            <View style={styles.sectionRow}>
              <Text style={styles.section}>EXTRACTED TOPICS</Text>
              <Text style={styles.sourceNote}>{sample ? 'Sample result' : 'Live result'}</Text>
            </View>

            {plan.topics.map((topic, index) => {
              const isExpanded = expandedTopic === topic.topic_name;
              return (
                <View key={`${topic.topic_name}-${index}`} style={styles.topic}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={() => onTopic(topic)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.topicHeading}>
                      <View style={styles.topicCopy}>
                        <Text style={styles.topicName}>{topic.topic_name}</Text>
                        <Text style={styles.topicMeta}>
                          {topic.subtopic_count} subtopics · {formatHours(topic.predicted_hours)}
                        </Text>
                      </View>
                      <EffortTierBadge tier={topic.difficulty_tier} />
                    </View>
                    <ConfidenceBar value={topic.confidence_score} />
                  </TouchableOpacity>

                  {/* Related Lectures Toggle Button */}
                  <View style={styles.topicActionsRow}>
                    <TouchableOpacity
                      accessibilityRole="button"
                      style={[styles.lecturesBtn, isExpanded && styles.lecturesBtnActive]}
                      onPress={() => setExpandedTopic(isExpanded ? null : topic.topic_name)}
                    >
                      <Text style={[styles.lecturesBtnText, isExpanded && styles.lecturesBtnTextActive]}>
                        {isExpanded ? 'Hide Lectures ▲' : 'Related Lectures ▶'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      accessibilityRole="button"
                      style={styles.detailLink}
                      onPress={() => onTopic(topic)}
                    >
                      <Text style={styles.detailLinkText}>View Details →</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Inline Related Lectures section */}
                  {isExpanded && <RelatedLectures topic={topic.topic_name} />}
                </View>
              );
            })}

            <Text style={styles.note}>Estimates are predictions and may not match your actual pace.</Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  page: { padding: 20, paddingBottom: 110 },
  upload: {
    minHeight: 210,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#6f5545',
    backgroundColor: colors.surface1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  uploadMark: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.orangeSoft,
    padding: 9,
    gap: 5,
    marginBottom: 12,
  },
  uploadLine: { height: 3, backgroundColor: colors.orange, borderRadius: 2 },
  uploadTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  uploadText: { color: colors.muted, textAlign: 'center', fontSize: 12, marginTop: 7 },
  uploadAction: { color: colors.orange, fontSize: 13, fontWeight: '800', marginTop: 18 },
  sampleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    minHeight: 50,
    alignItems: 'center',
  },
  sampleText: { color: colors.muted, fontSize: 12 },
  sampleAction: { color: colors.orange, fontSize: 12, fontWeight: '800' },
  summary: {
    marginTop: 16,
    marginBottom: 24,
    padding: 16,
    borderRadius: 14,
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.lineSoft,
  },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  kicker: { color: colors.orange, fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  total: {
    color: colors.ink,
    fontSize: 34,
    fontWeight: '800',
    marginTop: 5,
    fontVariant: ['tabular-nums'],
  },
  totalSub: { color: colors.muted, fontSize: 12, marginTop: 3, maxWidth: 220 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  section: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 0.7 },
  sourceNote: { color: colors.quiet, fontSize: 12 },
  topic: {
    borderRadius: 14,
    backgroundColor: colors.surface1,
    borderColor: colors.lineSoft,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  topicHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 14,
  },
  topicCopy: { flex: 1 },
  topicName: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  topicMeta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  topicActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
  },
  lecturesBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.lineSoft,
  },
  lecturesBtnActive: {
    backgroundColor: colors.orangeSoft,
    borderColor: colors.orange,
  },
  lecturesBtnText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  lecturesBtnTextActive: {
    color: colors.orange,
  },
  detailLink: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  detailLinkText: {
    color: colors.orange,
    fontSize: 11,
    fontWeight: '700',
  },
  note: { color: colors.quiet, fontSize: 12, lineHeight: 18, marginTop: 8 },
});
