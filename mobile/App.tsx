import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, StatusBar } from 'react-native';
import { AuthScreen } from './src/screens/AuthScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { StudyPlanScreen } from './src/screens/StudyPlanScreen';
import { TopicDetailScreen } from './src/screens/TopicDetailScreen';
import { ReoptimizeScreen } from './src/screens/ReoptimizeScreen';
import { NotesScannerScreen } from './src/screens/NotesScannerScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { clearToken, fetchMe, AuthUser } from './src/services/authApi';
import { MobilePredictResponse } from './src/services/api';
import { MobileExtractedTopic } from './src/services/notesScannerApi';
import { BrandMark, ErrorState } from './src/components/StudyUI';
import { colors } from './src/theme/colors';

type Tab = 'home' | 'plan' | 'schedule' | 'scan' | 'profile';
type Detail = MobilePredictResponse | MobileExtractedTopic;
const tabs: {key:Tab;label:string}[] = [{key:'home',label:'Home'},{key:'plan',label:'Plan'},{key:'schedule',label:'Schedule'},{key:'scan',label:'Scan'},{key:'profile',label:'Profile'}];

export default function App() { const [tab,setTab]=useState<Tab>('home');const [user,setUser]=useState<AuthUser|null>(null);const [checking,setChecking]=useState(true);const [sessionError,setSessionError]=useState<string|null>(null);const [detail,setDetail]=useState<Detail|null>(null);
 const checkSession=()=>{setChecking(true);setSessionError(null);fetchMe().then(setUser).catch((e:any)=>setSessionError(e?.message||'Could not reach the server.')).finally(()=>setChecking(false));};
 useEffect(()=>{checkSession();},[]);
 const logout=async()=>{await clearToken();setUser(null);setTab('home');};
 const showTopic=(topic:Detail)=>setDetail(topic);
 if(checking)return <SafeAreaView style={styles.loading}><StatusBar barStyle="light-content"/><BrandMark/><ActivityIndicator color={colors.orange}/><Text style={styles.loadingText}>Opening your study space</Text></SafeAreaView>;
 if(sessionError)return <SafeAreaView style={styles.sessionError}><BrandMark/><ErrorState message={`Couldn’t confirm your session: ${sessionError}`} retry={checkSession}/></SafeAreaView>;
 if(!user)return <AuthScreen onAuthenticated={setUser}/>;
 if(detail)return <TopicDetailScreen topic={detail} onBack={()=>setDetail(null)}/>;
 return <SafeAreaView style={styles.safe}><StatusBar barStyle="light-content" backgroundColor={colors.bg}/><View style={styles.topbar}><BrandMark/><Text style={styles.brand}>StudyForge</Text><View style={styles.topbarSpace}/><Text numberOfLines={1} style={styles.user}>{user.email}</Text></View><View style={styles.content}>{tab==='home'?<DashboardScreen onBuildPlan={()=>setTab('plan')} onTopic={showTopic}/>:tab==='plan'?<StudyPlanScreen onTopic={showTopic}/>:tab==='schedule'?<ReoptimizeScreen/>:tab==='scan'?<NotesScannerScreen onTopic={showTopic}/>:<ProfileScreen user={user} onLogout={logout}/>}</View><View style={styles.nav}>{tabs.map(item=><TouchableOpacity key={item.key} accessibilityRole="tab" accessibilityState={{selected:tab===item.key}} onPress={()=>{setDetail(null);setTab(item.key);}} style={[styles.navItem,tab===item.key&&styles.navActive]}><Text style={[styles.navText,tab===item.key&&styles.navTextActive]}>{item.label}</Text></TouchableOpacity>)}</View></SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:colors.bg},loading:{flex:1,backgroundColor:colors.bg,alignItems:'center',justifyContent:'center',gap:14},sessionError:{flex:1,backgroundColor:colors.bg,justifyContent:'center',padding:24,gap:18},loadingText:{color:colors.muted,fontSize:13},topbar:{height:60,paddingHorizontal:20,flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderBottomColor:colors.lineSoft,gap:9},brand:{color:colors.ink,fontWeight:'800',fontSize:16,letterSpacing:-.3},topbarSpace:{flex:1},user:{maxWidth:128,color:colors.muted,fontSize:11},content:{flex:1},nav:{height:68,paddingHorizontal:8,paddingTop:7,flexDirection:'row',backgroundColor:colors.surface0,borderTopWidth:1,borderTopColor:colors.lineSoft},navItem:{minWidth:0,flex:1,minHeight:48,borderRadius:10,alignItems:'center',justifyContent:'center'},navActive:{backgroundColor:colors.surface2},navText:{color:colors.quiet,fontSize:10,fontWeight:'800'},navTextActive:{color:colors.ink}});
