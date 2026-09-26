import { createAdaptiveStyles } from '../ui/adaptiveStyles';
import { ui } from '../ui/theme';
import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {View,Text,StyleSheet,ScrollView,TouchableOpacity,ActivityIndicator,Alert,RefreshControl} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useGym } from '../contexts/GymContext';
import { financeService } from '../services/financeService';
import { formatMoney } from '../utils/currency';
import type { FinanceSummary,FinanceTrendPoint,RenewalDueItem } from '../types/finance';

type Range='month'|'30d'|'year';
const dates=(r:Range)=>{
  const n=new Date(),to=new Date(n);to.setHours(23,59,59,999);
  let from:Date;
  if(r==='30d'){from=new Date(n);from.setDate(from.getDate()-29);from.setHours(0,0,0,0);}
  else if(r==='year')from=new Date(n.getFullYear(),0,1);
  else from=new Date(n.getFullYear(),n.getMonth(),1);
  return {from:from.toISOString(),to:new Date(to.getTime()+1).toISOString()};
};

export default function FinanceDashboardScreen(){
  const nav=useNavigation<any>();
  const {activeGym,activeGymId}=useGym();
  const [range,setRange]=useState<Range>('month');
  const [summary,setSummary]=useState<FinanceSummary|null>(null);
  const [trend,setTrend]=useState<FinanceTrendPoint[]>([]);
  const [renewals,setRenewals]=useState<RenewalDueItem[]>([]);
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);
  const d=useMemo(()=>dates(range),[range]);

  const load=useCallback(async()=>{
    if(!activeGymId)return;
    try{
      const [a,b,c]=await Promise.all([
        financeService.getSummary(activeGymId,d.from,d.to),
        financeService.getTrend(activeGymId,6),
        financeService.listRenewalsDue(activeGymId,20)
      ]);
      setSummary(a);setTrend(b);setRenewals(c);
    }catch(e:any){Alert.alert('Unable to load finance',e?.message||'Try again.');}
    finally{setLoading(false);setRefreshing(false);}
  },[activeGymId,d.from,d.to]);

  useEffect(()=>{setLoading(true);load();},[load]);

  if(loading||!summary)return <View style={s.center}><ActivityIndicator size="large" color="#4F46E5"/></View>;

  const currency=activeGym?.currencyCode||'PKR';
  const max=Math.max(1,...trend.flatMap(x=>[x.revenue,x.expenses]));

  return <ScrollView style={s.page} contentContainerStyle={s.content} refreshControl={
    <RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);load();}}/>
  }>
    <View style={s.hero}>
      <View style={s.heroRow}><View><Text style={s.eyebrow}>{activeGym?.name}</Text><Text style={s.heroTitle}>Finance</Text>
      <Text style={s.heroSub}>Revenue, operating expenses and net result.</Text></View>
      <TouchableOpacity style={s.expBtn} onPress={()=>nav.navigate('Expenses')}><Ionicons name="receipt-outline" size={18} color="#FFF"/><Text style={s.expBtnText}>Expenses</Text></TouchableOpacity></View>
      <View style={s.rangeRow}>
        {([['month','This month'],['30d','30 days'],['year','This year']] as const).map(([k,l])=>
          <TouchableOpacity key={k} onPress={()=>setRange(k)} style={[s.range,range===k&&s.rangeOn]}><Text style={[s.rangeText,range===k&&s.rangeTextOn]}>{l}</Text></TouchableOpacity>)}
      </View>
    </View>

    <View style={s.grid}>
      <View style={[s.kpi,s.green]}><Ionicons name="arrow-down-outline" size={20} color="#047857"/><Text style={s.kpiLabel}>REVENUE</Text><Text style={s.kpiValue}>{formatMoney(summary.revenue,currency)}</Text><Text style={s.meta}>{summary.paymentCount} payments</Text></View>
      <View style={[s.kpi,s.amber]}><Ionicons name="arrow-up-outline" size={20} color="#B45309"/><Text style={s.kpiLabel}>EXPENSES</Text><Text style={s.kpiValue}>{formatMoney(summary.expenses,currency)}</Text><Text style={s.meta}>{summary.expenseCount} entries</Text></View>
    </View>

    <View style={s.net}><View><Text style={s.netLabel}>NET RESULT</Text><Text style={[s.netValue,summary.net<0&&s.red]}>{formatMoney(summary.net,currency)}</Text></View>
    <View style={[s.netIcon,summary.net<0&&s.netIconRed]}><Ionicons name={summary.net>=0?'trending-up':'trending-down'} size={22} color={summary.net>=0?'#047857':'#B91C1C'}/></View></View>

    <View style={s.card}><Text style={s.title}>6-month trend</Text><Text style={s.sub}>Revenue vs expenses</Text>
      <View style={s.chart}>{trend.map(x=><View key={x.month} style={s.col}><View style={s.bars}><View style={[s.bar,s.revBar,{height:Math.max(4,x.revenue/max*105)}]}/><View style={[s.bar,s.expBar,{height:Math.max(4,x.expenses/max*105)}]}/></View><Text style={s.chartLabel}>{x.label}</Text></View>)}</View>
      <View style={s.legend}><Text style={s.legendText}>Revenue</Text><Text style={[s.legendText,{color: ui.color.warning}]}>Expenses</Text></View>
    </View>

    <Break title="Payment methods" subtitle="How members paid in this period." items={summary.paymentMethods} currency={currency}/>
    <Break title="Expense categories" subtitle="Where operating money went." items={summary.expenseCategories} currency={currency}/>

    <View style={s.grid}>
      <View style={s.att}><Ionicons name="time-outline" size={21} color="#B45309"/><Text style={s.attNum}>{summary.expiring7Days}</Text><Text style={s.attLabel}>Expiring in 7 days</Text></View>
      <View style={s.att}><Ionicons name="alert-circle-outline" size={21} color="#B91C1C"/><Text style={s.attNum}>{summary.expiredMembers}</Text><Text style={s.attLabel}>Expired memberships</Text></View>
    </View>

    <View style={s.card}><Text style={s.title}>Renewal follow-up</Text><Text style={s.sub}>Operational follow-up, not accounts receivable.</Text>
      {renewals.length===0?<Text style={s.empty}>No memberships need near-term follow-up.</Text>
      :renewals.slice(0,12).map(x=><View key={x.clientId} style={s.renew}><View style={[s.renewIcon,x.state==='expired'?s.renewRed:s.renewAmber]}><Ionicons name={x.state==='expired'?'alert':'time'} size={17} color={x.state==='expired'?'#B91C1C':'#B45309'}/></View>
      <View style={{flex:1}}><Text style={s.renewName}>{x.name}</Text><Text style={s.meta}>{x.state==='expired'?`Expired ${Math.abs(x.daysDelta)} days ago`:`Expires in ${Math.max(0,x.daysDelta)} days`}</Text></View>
      <Text style={s.meta}>{new Date(x.dueDate).toLocaleDateString()}</Text></View>)}
    </View>

    <View style={s.note}><Ionicons name="information-circle-outline" size={18} color="#475569"/><Text style={s.noteText}>Renewal counts identify follow-up opportunities. They are not treated as debt because the app does not yet have an invoice ledger.</Text></View>
  </ScrollView>;
}

function Break({title,subtitle,items,currency}:{title:string;subtitle:string;items:{key:string;amount:number;count:number}[];currency:string}){
  return <View style={s.card}><Text style={s.title}>{title}</Text><Text style={s.sub}>{subtitle}</Text>
    {items.length===0?<Text style={s.empty}>No data in this range.</Text>:items.map(x=><View key={x.key} style={s.breakRow}><View style={{flex:1}}><Text style={s.breakName}>{x.key.replace(/_/g,' ')}</Text><Text style={s.meta}>{x.count} entries</Text></View><Text style={s.breakAmount}>{formatMoney(x.amount,currency as any)}</Text></View>)}
  </View>;
}

const s=createAdaptiveStyles({
  page:{flex:1,backgroundColor: ui.color.canvas},content:{padding:17,paddingBottom:44},center:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor: ui.color.canvas},
  hero:{backgroundColor: ui.color.brandStrong,borderRadius:22,padding:19,marginBottom:13},heroRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start'},eyebrow:{color:'#C7D2FE',fontSize:10,fontWeight:'900'},
  heroTitle:{color:'#FFF',fontSize:27,fontWeight:'900',marginTop:3},heroSub:{color:'#E0E7FF',fontSize:11,marginTop:4},expBtn:{backgroundColor:'rgba(255,255,255,.13)',borderRadius:13,paddingHorizontal:10,paddingVertical:9,flexDirection:'row',gap:6,alignItems:'center'},
  expBtnText:{color:'#FFF',fontSize:10,fontWeight:'900'},rangeRow:{flexDirection:'row',gap:7,marginTop:18},range:{backgroundColor:'rgba(255,255,255,.08)',borderRadius:999,paddingHorizontal:11,paddingVertical:7},
  rangeOn:{backgroundColor: ui.color.surface},rangeText:{color:'#C7D2FE',fontSize:9,fontWeight:'800'},rangeTextOn:{color: ui.color.brand},grid:{flexDirection:'row',gap:10,marginBottom:10},
  kpi:{flex:1,backgroundColor: ui.color.surface,borderWidth:1,borderRadius:18,padding:15},green:{borderColor: ui.color.successBorder},amber:{borderColor: ui.color.warningBorder},kpiLabel:{color: ui.color.textSecondary,fontSize:8,fontWeight:'900',marginTop:10},
  kpiValue:{color: ui.color.text,fontSize:18,fontWeight:'900',marginTop:4},meta:{color: ui.color.textMuted,fontSize:9,marginTop:3},net:{backgroundColor: ui.color.surface,borderWidth:1,borderColor: ui.color.brandBorder,borderRadius:18,padding:17,flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:11},
  netLabel:{color: ui.color.brand,fontSize:9,fontWeight:'900'},netValue:{color: ui.color.success,fontSize:25,fontWeight:'900',marginTop:3},red:{color: ui.color.danger},netIcon:{width:48,height:48,borderRadius:15,backgroundColor: ui.color.successSoft,alignItems:'center',justifyContent:'center'},
  netIconRed:{backgroundColor: ui.color.dangerSoft},card:{backgroundColor: ui.color.surface,borderWidth:1,borderColor: ui.color.border,borderRadius:18,padding:16,marginBottom:11},title:{color: ui.color.text,fontSize:15,fontWeight:'900'},sub:{color: ui.color.textSecondary,fontSize:10,marginTop:3},
  chart:{marginTop:16,height:130,flexDirection:'row',alignItems:'flex-end'},col:{flex:1,alignItems:'center'},bars:{height:108,flexDirection:'row',alignItems:'flex-end',gap:3},bar:{width:8,borderRadius:4},revBar:{backgroundColor: ui.color.brand},expBar:{backgroundColor: ui.color.warning},
  chartLabel:{color: ui.color.textMuted,fontSize:8,marginTop:5},legend:{flexDirection:'row',gap:16,justifyContent:'center',marginTop:10},legendText:{color: ui.color.brand,fontSize:9,fontWeight:'800'},
  breakRow:{flexDirection:'row',alignItems:'center',paddingVertical:10,borderTopWidth:1,borderTopColor: ui.color.divider},breakName:{color: ui.color.text,fontSize:12,fontWeight:'800',textTransform:'capitalize'},breakAmount:{color: ui.color.textSecondary,fontSize:12,fontWeight:'900'},
  att:{flex:1,backgroundColor: ui.color.surface,borderWidth:1,borderColor: ui.color.border,borderRadius:17,padding:14},attNum:{color: ui.color.text,fontSize:21,fontWeight:'900',marginTop:8},attLabel:{color: ui.color.textSecondary,fontSize:9,marginTop:2},
  renew:{flexDirection:'row',alignItems:'center',paddingVertical:10,borderTopWidth:1,borderTopColor: ui.color.divider},renewIcon:{width:36,height:36,borderRadius:12,alignItems:'center',justifyContent:'center',marginRight:10},renewRed:{backgroundColor: ui.color.dangerSoft},renewAmber:{backgroundColor: ui.color.warningSoft},
  renewName:{color: ui.color.text,fontSize:12,fontWeight:'800'},empty:{color: ui.color.textMuted,fontSize:11,marginTop:12},note:{backgroundColor: ui.color.surfaceSubtle,borderRadius:14,padding:13,flexDirection:'row',gap:8},
  noteText:{flex:1,color: ui.color.textSecondary,fontSize:10,lineHeight:15,fontWeight:'600'},
});