import { createAdaptiveStyles } from '../ui/adaptiveStyles';
import { ui } from '../ui/theme';
import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {
  View,Text,StyleSheet,ScrollView,TextInput,TouchableOpacity,
  Alert,ActivityIndicator,RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGym } from '../contexts/GymContext';
import { useGymPermissions } from '../hook/useGymPermissions';
import { financeService } from '../services/financeService';
import { formatMoney } from '../utils/currency';
import type { PaymentMethod } from '../types';
import type { ExpenseRecord } from '../types/finance';

const categories=['Rent','Electricity','Gas','Trainer Salary','Staff Salary','Equipment','Maintenance','Cleaning','Marketing','Internet','Supplies','Other'];
const label:Record<PaymentMethod,string>={
  cash:'Cash',bank_transfer:'Bank',raast:'Raast',easypaisa:'Easypaisa',
  jazzcash:'JazzCash',upi:'UPI',card:'Card',other:'Other'
};
const ymd=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

export default function ExpensesScreen(){
  const {activeGym,activeGymId}=useGym();
  const {role}=useGymPermissions();
  const canVoid=['owner','admin'].includes(role||'');
  const [rows,setRows]=useState<ExpenseRecord[]>([]);
  const [editing,setEditing]=useState<ExpenseRecord|null>(null);
  const [description,setDescription]=useState('');
  const [amount,setAmount]=useState('');
  const [category,setCategory]=useState('Rent');
  const [date,setDate]=useState(ymd(new Date()));
  const [method,setMethod]=useState<PaymentMethod>('cash');
  const [reference,setReference]=useState('');
  const [notes,setNotes]=useState('');
  const [showVoided,setShowVoided]=useState(false);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [refreshing,setRefreshing]=useState(false);

  const methods=useMemo<PaymentMethod[]>(()=>activeGym?.countryCode==='IN'
    ? ['cash','upi','bank_transfer','card','other']
    : ['cash','raast','easypaisa','jazzcash','bank_transfer','card','other']
  ,[activeGym?.countryCode]);

  const load=useCallback(async()=>{
    if(!activeGymId)return;
    try{setRows(await financeService.listExpenses(activeGymId,showVoided));}
    catch(e:any){Alert.alert('Unable to load expenses',e?.message||'Try again.');}
    finally{setLoading(false);setRefreshing(false);}
  },[activeGymId,showVoided]);

  useEffect(()=>{load();},[load]);

  const reset=()=>{
    setEditing(null);setDescription('');setAmount('');setCategory('Rent');
    setDate(ymd(new Date()));setMethod('cash');setReference('');setNotes('');
  };

  const edit=(x:ExpenseRecord)=>{
    if(x.status==='voided')return;
    setEditing(x);setDescription(x.description);setAmount(String(x.amount));
    setCategory(x.category);setDate(x.expenseDate.slice(0,10));
    setMethod(x.paymentMethod);setReference(x.referenceNumber||'');setNotes(x.notes||'');
  };

  const save=async()=>{
    if(!activeGymId)return;
    const n=Number(amount);
    if(!description.trim()){Alert.alert('Description required');return;}
    if(!Number.isFinite(n)||n<=0){Alert.alert('Invalid amount');return;}
    const d=new Date(`${date}T12:00:00`);
    if(Number.isNaN(d.getTime())){Alert.alert('Invalid date','Use YYYY-MM-DD.');return;}
    try{
      setSaving(true);
      await financeService.saveExpense({
        gymId:activeGymId,expenseId:editing?.id||null,description,amount:n,
        category,expenseDate:d.toISOString(),paymentMethod:method,
        referenceNumber:reference,notes
      });
      reset();await load();
    }catch(e:any){Alert.alert('Unable to save expense',e?.message||'Try again.');}
    finally{setSaving(false);}
  };

  const voidExpense=(x:ExpenseRecord)=>{
    Alert.alert(
      'Void expense?',
      'The record stays in financial history and will be excluded from totals.',
      [
        {text:'Cancel',style:'cancel'},
        {text:'Void',style:'destructive',onPress:async()=>{
          try{await financeService.voidExpense(x.id,'Incorrect or cancelled entry');await load();}
          catch(e:any){Alert.alert('Unable to void expense',e?.message||'Try again.');}
        }}
      ]
    );
  };

  const total=rows.filter(x=>x.status==='active').reduce((a,b)=>a+b.amount,0);

  if(loading)return <View style={s.center}><ActivityIndicator size="large" color="#4F46E5"/></View>;

  return <ScrollView style={s.page} contentContainerStyle={s.content} refreshControl={
    <RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);load();}}/>
  }>
    <View style={s.hero}>
      <View><Text style={s.eyebrow}>{activeGym?.name}</Text><Text style={s.heroTitle}>Expenses</Text>
      <Text style={s.heroSub}>Track operating costs with an auditable history.</Text></View>
      <View style={s.totalBox}><Text style={s.totalLabel}>SHOWN TOTAL</Text>
      <Text style={s.total}>{formatMoney(total,activeGym?.currencyCode||'PKR')}</Text></View>
    </View>

    <View style={s.card}>
      <View style={s.rowBetween}><Text style={s.title}>{editing?'Edit expense':'Add expense'}</Text>
      {editing?<TouchableOpacity onPress={reset}><Text style={s.link}>Cancel</Text></TouchableOpacity>:null}</View>

      <Text style={s.label}>Description</Text>
      <TextInput style={s.input} value={description} onChangeText={setDescription} placeholder="September electricity bill"
      placeholderTextColor={ui.color.textMuted}
    />

      <Text style={s.label}>Category</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
        {categories.map(x=><TouchableOpacity key={x} style={[s.chip,category===x&&s.chipOn]} onPress={()=>setCategory(x)}>
          <Text style={[s.chipText,category===x&&s.chipTextOn]}>{x}</Text>
        </TouchableOpacity>)}
      </ScrollView>

      <View style={s.two}>
        <View style={s.flex}><Text style={s.label}>Amount</Text><TextInput style={s.input} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="25000"
      placeholderTextColor={ui.color.textMuted}
    /></View>
        <View style={s.flex}><Text style={s.label}>Date</Text><TextInput style={s.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD"
      placeholderTextColor={ui.color.textMuted}
    /></View>
      </View>

      <Text style={s.label}>Paid via</Text>
      <View style={s.wrap}>{methods.map(x=><TouchableOpacity key={x} style={[s.chip,method===x&&s.payOn]} onPress={()=>setMethod(x)}>
        <Text style={[s.chipText,method===x&&s.payTextOn]}>{label[x]}</Text>
      </TouchableOpacity>)}</View>

      {method!=='cash'?<><Text style={s.label}>Reference</Text>
      <TextInput style={s.input} value={reference} onChangeText={setReference} placeholder="Optional transaction reference"
      placeholderTextColor={ui.color.textMuted}
    /></>:null}

      <Text style={s.label}>Notes</Text>
      <TextInput style={[s.input,s.area]} value={notes} onChangeText={setNotes} multiline placeholder="Optional note"
      placeholderTextColor={ui.color.textMuted}
    />

      <TouchableOpacity style={[s.primary,saving&&s.disabled]} onPress={save} disabled={saving}>
        {saving?<ActivityIndicator color="#FFF"/>:<><Ionicons name="checkmark-circle-outline" size={19} color="#FFF"/><Text style={s.primaryText}>{editing?'Save changes':'Record expense'}</Text></>}
      </TouchableOpacity>
    </View>

    <View style={s.rowBetween}>
      <Text style={s.section}>EXPENSE HISTORY</Text>
      <TouchableOpacity style={[s.toggle,showVoided&&s.toggleOn]} onPress={()=>setShowVoided(v=>!v)}>
        <Text style={[s.toggleText,showVoided&&s.toggleTextOn]}>{showVoided?'Showing voided':'Show voided'}</Text>
      </TouchableOpacity>
    </View>

    <View style={s.list}>
      {rows.length===0?<View style={s.empty}><Ionicons name="receipt-outline" size={34} color="#94A3B8"/><Text style={s.emptyText}>No expenses recorded</Text></View>
      :rows.map((x,i)=><TouchableOpacity key={x.id} activeOpacity={x.status==='voided'?1:.75} onPress={()=>edit(x)}
        style={[s.expense,i>0&&s.border,x.status==='voided'&&s.voided]}>
        <View style={s.expIcon}><Ionicons name="receipt-outline" size={18} color={x.status==='voided'?'#94A3B8':'#B45309'}/></View>
        <View style={s.flex}><Text style={[s.expTitle,x.status==='voided'&&s.strike]}>{x.description}</Text>
        <Text style={s.meta}>{x.category}  -  {new Date(x.expenseDate).toLocaleDateString()}  -  {label[x.paymentMethod]}</Text>
        {x.status==='voided'?<Text style={s.voidReason}>VOIDED{x.voidReason?`  -  ${x.voidReason}`:''}</Text>:null}</View>
        <View style={s.amountCol}><Text style={[s.expAmount,x.status==='voided'&&s.strike]}>{formatMoney(x.amount,activeGym?.currencyCode||'PKR')}</Text>
        {canVoid&&x.status==='active'?<TouchableOpacity onPress={()=>voidExpense(x)}><Text style={s.voidLink}>Void</Text></TouchableOpacity>:null}</View>
      </TouchableOpacity>)}
    </View>
  </ScrollView>;
}

const s=createAdaptiveStyles({
  page:{flex:1,backgroundColor: ui.color.canvas},content:{padding:17,paddingBottom:44},center:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor: ui.color.canvas},
  hero:{backgroundColor: ui.color.brandStrong,borderRadius:22,padding:19,flexDirection:'row',justifyContent:'space-between',alignItems:'flex-end',marginBottom:14},
  eyebrow:{color:'#C7D2FE',fontSize:10,fontWeight:'900'},heroTitle:{color:'#FFF',fontSize:26,fontWeight:'900',marginTop:3},heroSub:{color:'#E0E7FF',fontSize:11,marginTop:4,maxWidth:210},
  totalBox:{alignItems:'flex-end'},totalLabel:{color:'#C7D2FE',fontSize:8,fontWeight:'900'},total:{color:'#FFF',fontSize:18,fontWeight:'900',marginTop:4},
  card:{backgroundColor: ui.color.surface,borderWidth:1,borderColor: ui.color.border,borderRadius:20,padding:17,marginBottom:20},rowBetween:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  title:{color: ui.color.text,fontSize:18,fontWeight:'900'},link:{color: ui.color.brand,fontSize:12,fontWeight:'800'},label:{color: ui.color.textSecondary,fontSize:11,fontWeight:'800',marginTop:14,marginBottom:7},
  input:{borderWidth:1,borderColor:'#CBD5E1',backgroundColor: ui.color.canvas,borderRadius:13,paddingHorizontal:13,paddingVertical:12,color: ui.color.text},area:{minHeight:70,textAlignVertical:'top'},
  chips:{gap:7,paddingRight:12},chip:{borderWidth:1,borderColor: ui.color.border,borderRadius:999,paddingHorizontal:10,paddingVertical:7},chipOn:{backgroundColor:'#FFF7ED',borderColor: ui.color.warning},
  chipText:{color: ui.color.textSecondary,fontSize:10,fontWeight:'800'},chipTextOn:{color: ui.color.warning},payOn:{backgroundColor: ui.color.brandSoft,borderColor: ui.color.brand},payTextOn:{color: ui.color.brand},
  two:{flexDirection:'row',gap:9},flex:{flex:1},wrap:{flexDirection:'row',flexWrap:'wrap',gap:7},primary:{minHeight:51,borderRadius:14,backgroundColor: ui.color.brand,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,marginTop:17},
  primaryText:{color:'#FFF',fontSize:13,fontWeight:'900'},disabled:{opacity:.65},section:{color: ui.color.textSecondary,fontSize:10,fontWeight:'900',letterSpacing:1,marginBottom:8},
  toggle:{backgroundColor: ui.color.surfaceSubtle,borderRadius:999,paddingHorizontal:9,paddingVertical:5,marginBottom:8},toggleOn:{backgroundColor: ui.color.dangerSoft},toggleText:{color: ui.color.textSecondary,fontSize:9,fontWeight:'800'},toggleTextOn:{color: ui.color.danger},
  list:{backgroundColor: ui.color.surface,borderWidth:1,borderColor: ui.color.border,borderRadius:18,paddingHorizontal:13},expense:{flexDirection:'row',alignItems:'center',paddingVertical:13},border:{borderTopWidth:1,borderTopColor: ui.color.divider},
  voided:{opacity:.62},expIcon:{width:39,height:39,borderRadius:12,backgroundColor:'#FFF7ED',alignItems:'center',justifyContent:'center',marginRight:10},
  expTitle:{color: ui.color.text,fontSize:13,fontWeight:'900'},meta:{color: ui.color.textSecondary,fontSize:9,marginTop:3},amountCol:{alignItems:'flex-end',marginLeft:8},expAmount:{color: ui.color.text,fontSize:13,fontWeight:'900'},
  strike:{textDecorationLine:'line-through',color: ui.color.textMuted},voidLink:{color: ui.color.danger,fontSize:9,fontWeight:'900',marginTop:6},voidReason:{color: ui.color.danger,fontSize:8,fontWeight:'800',marginTop:4},
  empty:{paddingVertical:30,alignItems:'center'},emptyText:{color: ui.color.textSecondary,fontSize:13,fontWeight:'800',marginTop:8},
});