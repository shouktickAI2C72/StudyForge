import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, SafeAreaView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors } from '../theme/colors';
import { GlassCard } from '../components/GlassCard';
import { DataSourceBadge, EmptyState, ErrorState, PageHeader, formatHours } from '../components/StudyUI';
import { fetchPredictionHistory, MobilePredictResponse } from '../services/api';

export const DashboardScreen: React.FC<{ onBuildPlan: () => void; onTopic: (topic: MobilePredictResponse) => void }> = ({ onBuildPlan, onTopic }) => {
  const [items, setItems] = useState<MobilePredictResponse[] | null>(null); const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { setError(null); try { setItems((await fetchPredictionHistory()).predictions); } catch (e: any) { setError(e?.message || 'Could not load your saved estimates.'); } }, []);
  useEffect(() => { load(); }, [load]);
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
    <PageHeader eyebrow="YOUR STUDY SPACE" title="Good to see you." description="Your saved study estimates, in one calm place." />
    {error ? <ErrorState message={`Couldn’t load saved estimates: ${error}`} retry={load} /> : items === null ? <View style={styles.loading}><ActivityIndicator color={colors.orange} /></View> : items.length === 0 ? <EmptyState title="Start with a syllabus" body="Upload a syllabus or notes to get your first real study estimate." action="Build a study plan" onAction={onBuildPlan} /> : <>
      <GlassCard style={styles.next}><View style={styles.row}><View><Text style={styles.kicker}>NEXT TO REVIEW</Text><Text style={styles.nextTitle}>{items[0].topic_name}</Text><Text style={styles.nextMeta}>{items[0].formatted_time} estimated study time</Text></View><DataSourceBadge /></View><TouchableOpacity accessibilityRole="button" style={styles.linkButton} onPress={() => onTopic(items[0])}><Text style={styles.linkText}>View estimate</Text></TouchableOpacity></GlassCard>
      <View style={styles.sectionRow}><Text style={styles.section}>RECENT ESTIMATES</Text><Text style={styles.count}>{items.length} saved</Text></View>
      {items.slice(0, 6).map((item) => <TouchableOpacity accessibilityRole="button" key={`${item.id}-${item.topic_name}`} style={styles.item} onPress={() => onTopic(item)}><View style={styles.itemCopy}><Text style={styles.itemTitle}>{item.topic_name}</Text><Text style={styles.itemMeta}>{item.subtopic_count} subtopics · {item.difficulty_tier} effort</Text></View><Text style={styles.hours}>{formatHours(item.predicted_hours)}</Text></TouchableOpacity>)}
    </>}
  </ScrollView></SafeAreaView>;
};
const styles = StyleSheet.create({ safe:{flex:1,backgroundColor:colors.bg},page:{padding:20,paddingBottom:116},loading:{minHeight:200,alignItems:'center',justifyContent:'center'},next:{marginBottom:24},row:{flexDirection:'row',justifyContent:'space-between',gap:8},kicker:{color:colors.orange,fontSize:11,fontWeight:'800',letterSpacing:.7},nextTitle:{color:colors.ink,fontSize:20,fontWeight:'800',marginTop:7},nextMeta:{color:colors.muted,fontSize:13,marginTop:4},linkButton:{alignSelf:'flex-start',minHeight:44,justifyContent:'center',marginTop:12},linkText:{color:colors.orange,fontSize:13,fontWeight:'800'},sectionRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:8},section:{color:colors.muted,fontSize:11,fontWeight:'800',letterSpacing:.7},count:{color:colors.quiet,fontSize:12,fontVariant:['tabular-nums']},item:{minHeight:70,padding:14,marginBottom:8,borderRadius:12,backgroundColor:colors.surface1,borderWidth:1,borderColor:colors.lineSoft,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},itemCopy:{flex:1,paddingRight:12},itemTitle:{color:colors.ink,fontSize:14,fontWeight:'700'},itemMeta:{color:colors.muted,fontSize:12,marginTop:4},hours:{color:colors.ink,fontSize:14,fontWeight:'800',fontVariant:['tabular-nums']} });
