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
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../theme/colors';
import { GlassCard } from '../components/GlassCard';
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

export const NotesScannerScreen: React.FC<{ onTopic: (topic: MobileExtractedTopic) => void }> = ({
  onTopic,
}) => {
  const [result, setResult] = useState<MobileScanNotesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sample, setSample] = useState(false);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  const scan = async (fn: () => Promise<MobileScanNotesResponse>, isSample = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fn();
      setResult(data);
      setSample(isSample);
    } catch (e: any) {
      setResult(null);
      setError(e?.message || 'Could not scan this file.');
    } finally {
      setLoading(false);
    }
  };

  const camera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('Camera permission is needed to photograph your notes.');
      return;
    }
    const picked = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!picked.canceled && picked.assets?.[0]) {
      const a = picked.assets[0];
      scan(
        () =>
          scanPickedImage({
            uri: a.uri,
            fileName: a.fileName || undefined,
            mimeType: a.mimeType,
          }),
        false
      );
    }
  };

  const gallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo access is needed to upload notes.');
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (!picked.canceled && picked.assets?.[0]) {
      const a = picked.assets[0];
      scan(
        () =>
          scanPickedImage({
            uri: a.uri,
            fileName: a.fileName || undefined,
            mimeType: a.mimeType,
          }),
        false
      );
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <PageHeader
          eyebrow="SCAN NOTES"
          title="Bring your notes into focus."
          description="Photograph or upload a note page to extract topics and get live effort estimates."
        />

        <View style={styles.actions}>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={camera}
            disabled={loading}
            style={styles.primary}
          >
            {loading ? (
              <ActivityIndicator color={colors.bg} />
            ) : (
              <Text style={styles.primaryText}>Take a photo</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={gallery}
            disabled={loading}
            style={styles.secondary}
          >
            <Text style={styles.secondaryText}>Upload a photo</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sampleRow}>
          <Text style={styles.sampleText}>Or explore the flow with a</Text>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => scan(() => scanSample('ds_notes.png'), true)}
            disabled={loading}
          >
            <Text style={styles.sampleAction}>Sample scan</Text>
          </TouchableOpacity>
        </View>

        {error && <ErrorState message={`Scan failed: ${error}`} retry={gallery} />}

        {result && (
          <>
            <GlassCard style={styles.summary}>
              <View style={styles.summaryTop}>
                <View>
                  <Text style={styles.kicker}>SCAN COMPLETE</Text>
                  <Text style={styles.sumTitle}>{result.total_topics_detected} topics found</Text>
                  <Text style={styles.sumSub}>
                    {formatHours(result.total_estimated_hours)} estimated study time
                  </Text>
                </View>
                <DataSourceBadge sample={sample} />
              </View>
              <View style={styles.raw}>
                <Text style={styles.rawLabel}>EXTRACTED TEXT</Text>
                <Text numberOfLines={4} style={styles.rawText}>
                  {result.extracted_raw_text}
                </Text>
              </View>
            </GlassCard>

            <Text style={styles.section}>TOPICS FROM THIS SCAN</Text>

            {result.topics.map((topic, index) => {
              const isExpanded = expandedTopic === topic.topic_name;
              return (
                <View key={`${topic.topic_name}-${index}`} style={styles.topic}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={() => onTopic(topic)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.topicTop}>
                      <View style={styles.topicCopy}>
                        <Text style={styles.topicName}>{topic.topic_name}</Text>
                        <Text style={styles.topicMeta}>
                          {topic.subtopic_count} subtopics · {topic.formatted_time}
                        </Text>
                      </View>
                      <EffortTierBadge tier={topic.difficulty_tier} />
                    </View>
                    <ConfidenceBar value={topic.confidence_score} />
                  </TouchableOpacity>

                  {/* Actions row */}
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

                  {/* Inline lectures section */}
                  {isExpanded && <RelatedLectures topic={topic.topic_name} />}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  page: { padding: 20, paddingBottom: 110 },
  actions: { gap: 8 },
  primary: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.orange,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryText: { color: colors.bg, fontSize: 14, fontWeight: '800' },
  secondary: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryText: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  sampleRow: {
    minHeight: 52,
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
  },
  sampleText: { color: colors.muted, fontSize: 12 },
  sampleAction: { color: colors.orange, fontSize: 12, fontWeight: '800' },
  summary: { marginTop: 16, marginBottom: 24 },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  kicker: { color: colors.orange, fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  sumTitle: { color: colors.ink, fontSize: 20, fontWeight: '800', marginTop: 6 },
  sumSub: { color: colors.muted, fontSize: 13, marginTop: 4, fontVariant: ['tabular-nums'] },
  raw: { marginTop: 16, padding: 12, borderRadius: 9, backgroundColor: colors.surface0 },
  rawLabel: { color: colors.quiet, fontSize: 10, fontWeight: '800', letterSpacing: 0.6, marginBottom: 5 },
  rawText: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  section: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 0.7, marginBottom: 8 },
  topic: {
    padding: 14,
    borderRadius: 14,
    borderColor: colors.lineSoft,
    borderWidth: 1,
    backgroundColor: colors.surface1,
    marginBottom: 12,
  },
  topicTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 14 },
  topicCopy: { flex: 1 },
  topicName: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  topicMeta: { color: colors.muted, fontSize: 12, marginTop: 4 },
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
});
