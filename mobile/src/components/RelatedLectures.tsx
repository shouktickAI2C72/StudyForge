import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { colors } from '../theme/colors';
import { fetchTopicVideos, MobileTopicVideo } from '../services/youtubeApi';

interface RelatedLecturesProps {
  topic: string;
}

export const RelatedLectures: React.FC<RelatedLecturesProps> = ({ topic }) => {
  const [videos, setVideos] = useState<MobileTopicVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  useEffect(() => {
    if (!topic || !topic.trim()) {
      setVideos([]);
      setActiveVideoId(null);
      setError(null);
      return;
    }

    let isMounted = true;
    const loadVideos = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchTopicVideos(topic.trim());
        if (isMounted) {
          setVideos(res.videos || []);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Could not load video lectures');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadVideos();

    return () => {
      isMounted = false;
    };
  }, [topic]);

  if (!topic || !topic.trim()) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.badgeRow}>
          <View style={styles.ytIcon}>
            <Text style={styles.ytIconText}>▶</Text>
          </View>
          <Text style={styles.heading}>RELATED LECTURES</Text>
        </View>
      </View>

      {/* Loading state */}
      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={colors.orange} />
          <Text style={styles.loadingText}>Searching lectures for &ldquo;{topic}&rdquo;...</Text>
        </View>
      )}

      {/* Error state */}
      {!loading && error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.retryBtn}
            onPress={() => {
              setLoading(true);
              setError(null);
              fetchTopicVideos(topic)
                .then((res) => setVideos(res.videos || []))
                .catch((e) => setError(e?.message || 'Failed again'))
                .finally(() => setLoading(false));
            }}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Empty state */}
      {!loading && !error && videos.length === 0 && (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No video lectures found for this topic.</Text>
        </View>
      )}

      {/* Inline Embedded Preview */}
      {activeVideoId && (
        <View style={styles.previewContainer}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewLabel}>● PREVIEW PLAYING</Text>
            <TouchableOpacity accessibilityRole="button" onPress={() => setActiveVideoId(null)}>
              <Text style={styles.closeBtn}>✕ Close</Text>
            </TouchableOpacity>
          </View>

          {Platform.OS === 'web' ? (
            // Standard YouTube iframe embed
            <div
              style={{
                position: 'relative',
                paddingBottom: '56.25%',
                height: 0,
                overflow: 'hidden',
                borderRadius: 10,
                backgroundColor: '#000',
                border: '1px solid #303136',
              }}
            >
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${activeVideoId}?autoplay=1`}
                title="YouTube lecture preview"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: 0,
                }}
              />
            </div>
          ) : (
            <View style={styles.nativeEmbedPlaceholder}>
              <Text style={styles.nativeEmbedText}>Playing: {activeVideoId}</Text>
            </View>
          )}
        </View>
      )}

      {/* Video List */}
      {!loading && !error && videos.length > 0 && (
        <View style={styles.videoList}>
          {videos.map((vid) => {
            const isPlaying = activeVideoId === vid.video_id;
            return (
              <TouchableOpacity
                accessibilityRole="button"
                key={vid.video_id}
                style={[styles.videoCard, isPlaying && styles.videoCardActive]}
                onPress={() => setActiveVideoId(vid.video_id)}
                activeOpacity={0.8}
              >
                <View style={styles.thumbWrapper}>
                  <Image source={{ uri: vid.thumbnail_url }} style={styles.thumbnail} resizeMode="cover" />
                  {vid.duration && vid.duration !== '?' && (
                    <View style={styles.durationBadge}>
                      <Text style={styles.durationText}>{vid.duration}</Text>
                    </View>
                  )}
                  <View style={styles.playOverlay}>
                    <Text style={styles.playSymbol}>▶</Text>
                  </View>
                </View>

                <View style={styles.videoInfo}>
                  <Text style={styles.videoTitle} numberOfLines={2} ellipsizeMode="tail">
                    {vid.title}
                  </Text>
                  <Text style={styles.channelName} numberOfLines={1}>
                    {vid.channel_name}
                  </Text>
                  {isPlaying && <Text style={styles.playingTag}>Now playing preview</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  ytIcon: {
    width: 20,
    height: 16,
    borderRadius: 3,
    backgroundColor: '#FF0000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ytIconText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
  heading: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.lineSoft,
  },
  loadingText: {
    color: colors.muted,
    fontSize: 12,
  },
  errorBox: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.redSoft,
    borderWidth: 1,
    borderColor: colors.red,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: colors.red,
    fontSize: 12,
    flex: 1,
  },
  retryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.surface2,
    borderRadius: 6,
  },
  retryText: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '700',
  },
  emptyBox: {
    padding: 18,
    borderRadius: 12,
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.quiet,
    fontSize: 12,
  },
  previewContainer: {
    marginBottom: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.orange,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewLabel: {
    color: colors.orange,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  closeBtn: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  nativeEmbedPlaceholder: {
    height: 180,
    backgroundColor: '#000',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nativeEmbedText: {
    color: '#fff',
    fontSize: 12,
  },
  videoList: {
    gap: 8,
  },
  videoCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    alignItems: 'center',
  },
  videoCardActive: {
    borderColor: colors.orange,
    backgroundColor: colors.orangeSoft,
  },
  thumbWrapper: {
    position: 'relative',
    width: 96,
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 3,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  durationText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  playSymbol: {
    color: '#fff',
    fontSize: 14,
  },
  videoInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  videoTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
  },
  channelName: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 3,
  },
  playingTag: {
    color: colors.orange,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 3,
  },
});
