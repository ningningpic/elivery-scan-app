import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, ScrollView, Alert, Image } from 'react-native';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';

export default function App() {
  const [hasPermission, setHasPermission] = useState(null);
  const [currentView, setCurrentView] = useState('home');
  const [image, setImage] = useState(null);
  const [records, setRecords] = useState([]);
  const [currentRecord, setCurrentRecord] = useState({
    supplierName: '',
    deliveryDate: '',
    products: []
  });

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const takePhoto = async () => {
    if (!hasPermission) {
      Alert.alert('提示', '需要相机权限');
      return;
    }
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      simulateOCR();
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      simulateOCR();
    }
  };

  const simulateOCR = () => {
    // 模拟OCR识别
    setCurrentRecord({
      supplierName: '华南食品供应商',
      deliveryDate: new Date().toISOString().split('T')[0],
      products: [
        { name: '有机大米 5kg', quantity: 10, unit: '袋', unitPrice: 68.00, amount: 680.00 },
        { name: '食用油 5L', quantity: 5, unit: '桶', unitPrice: 89.00, amount: 445.00 }
      ]
    });
    setCurrentView('result');
  };

  const saveRecord = () => {
    if (!currentRecord.supplierName || !currentRecord.deliveryDate) {
      Alert.alert('提示', '请填写完整信息');
      return;
    }
    const newRecord = {
      ...currentRecord,
      id: Date.now().toString(),
      createTime: new Date().toISOString(),
      totalAmount: currentRecord.products.reduce((sum, p) => sum + p.amount, 0)
    };
    setRecords([newRecord, ...records]);
    Alert.alert('成功', '记录已保存');
    setCurrentView('home');
    setImage(null);
  };

  const exportToExcel = async () => {
    if (records.length === 0) {
      Alert.alert('提示', '暂无记录可导出');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(
      records.flatMap(r => r.products.map((p, i) => ({
        '序号': i + 1,
        '供应商名称': r.supplierName,
        '送货日期': r.deliveryDate,
        '商品名称': p.name,
        '数量': p.quantity,
        '单位': p.unit,
        '单价': p.unitPrice,
        '金额': p.amount
      })))
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '送货记录');
    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

    const uri = FileSystem.documentDirectory + '送货记录.xlsx';
    await FileSystem.writeAsStringAsync(uri, wbout, { encoding: FileSystem.EncodingType.Base64 });
    await Sharing.shareAsync(uri);
  };

  if (currentView === 'home') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>送货扫码</Text>
          <Text style={styles.headerSubtitle}>扫描送货单据,快速录入信息</Text>
        </View>

        <View style={styles.content}>
          <TouchableOpacity style={styles.primaryButton} onPress={takePhoto}>
            <Text style={styles.buttonIcon}>📷</Text>
            <Text style={styles.buttonText}>拍照扫描</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={pickImage}>
            <Text style={styles.buttonIcon}>🖼️</Text>
            <Text style={styles.buttonText}>从相册选择</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuButton} onPress={() => setCurrentView('history')}>
            <Text style={styles.menuButtonText}>📋 历史记录 ({records.length})</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuButton} onPress={exportToExcel}>
            <Text style={styles.menuButtonText}>📊 导出Excel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (currentView === 'result') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>识别结果</Text>
        </View>

        <ScrollView style={styles.content}>
          {image && <Image source={{ uri: image }} style={styles.previewImage} />}

          <View style={styles.formGroup}>
            <Text style={styles.label}>供应商名称 *</Text>
            <TextInput
              style={styles.input}
              value={currentRecord.supplierName}
              onChangeText={(text) => setCurrentRecord({ ...currentRecord, supplierName: text })}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>送货日期 *</Text>
            <TextInput
              style={styles.input}
              value={currentRecord.deliveryDate}
              onChangeText={(text) => setCurrentRecord({ ...currentRecord, deliveryDate: text })}
            />
          </View>

          <Text style={styles.label}>商品明细</Text>
          {currentRecord.products.map((product, index) => (
            <View key={index} style={styles.productItem}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productDetail}>
                {product.quantity}{product.unit} × ¥{product.unitPrice.toFixed(2)} = ¥{product.amount.toFixed(2)}
              </Text>
            </View>
          ))}

          <View style={styles.totalAmount}>
            <Text style={styles.totalLabel}>总金额</Text>
            <Text style={styles.totalValue}>
              ¥{currentRecord.products.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
            </Text>
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={saveRecord}>
            <Text style={styles.buttonText}>✓ 确认保存</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={() => setCurrentView('home')}>
            <Text style={styles.buttonText}>取消</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  if (currentView === 'history') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>历史记录</Text>
        </View>

        <ScrollView style={styles.content}>
          {records.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>暂无送货记录</Text>
            </View>
          ) : (
            records.map((record) => (
              <View key={record.id} style={styles.historyItem}>
                <Text style={styles.historyTitle}>{record.supplierName}</Text>
                <Text style={styles.historyDate}>{record.deliveryDate}</Text>
                <Text style={styles.historyInfo}>
                  {record.products.length}种商品 | ¥{record.totalAmount.toFixed(2)}
                </Text>
              </View>
            ))
          )}
        </ScrollView>

        <TouchableOpacity style={styles.backButton} onPress={() => setCurrentView('home')}>
          <Text style={styles.buttonText}>返回</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#2563eb',
    padding: 20,
    paddingTop: 50,
  },
  headerTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'white',
    fontSize: 14,
    marginTop: 5,
    opacity: 0.9,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  secondaryButton: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  menuButton: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  menuButtonText: {
    fontSize: 16,
    color: '#374151',
  },
  buttonIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 5,
    color: '#6b7280',
  },
  input: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 15,
  },
  productItem: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  productDetail: {
    fontSize: 12,
    color: '#6b7280',
  },
  totalAmount: {
    backgroundColor: '#10b981',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  totalLabel: {
    color: 'white',
    fontSize: 12,
  },
  totalValue: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 5,
  },
  historyItem: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  historyDate: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 3,
  },
  historyInfo: {
    fontSize: 14,
    color: '#374151',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  backButton: {
    backgroundColor: '#6b7280',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    margin: 20,
  },
});
