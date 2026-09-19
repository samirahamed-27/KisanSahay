import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { Colors } from '../theme/colors';
import { useProfileStore } from '../store/profileStore';
import { convertLandArea, LandUnit, formatLandArea } from '../utils/unitConverter';

type ProfileScreenProp = StackNavigationProp<RootStackParamList>;

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileScreenProp>();
  const { profile, updateProfile } = useProfileStore();

  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [stateName, setStateName] = useState(profile.state);
  const [district, setDistrict] = useState(profile.district);
  const [landArea, setLandArea] = useState(profile.landArea.toString());
  const [landUnit, setLandUnit] = useState<LandUnit>(profile.landUnit);
  const [cropType, setCropType] = useState(profile.cropType);
  const [income, setIncome] = useState(profile.income.toString());
  const [hasKcc, setHasKcc] = useState(profile.hasKcc);
  const [aadhaarLinked, setAadhaarLinked] = useState(profile.aadhaarLinked);

  const units: LandUnit[] = ['acre', 'hectare', 'bigha', 'guntha', 'biswa'];

  const handleUnitChange = (newUnit: LandUnit) => {
    const currentNum = Number(landArea) || 0;
    const converted = convertLandArea(currentNum, landUnit, newUnit);
    setLandUnit(newUnit);
    setLandArea(converted.toString());
  };

  const handleSave = async () => {
    await updateProfile({
      name: name.trim(),
      phone: phone.trim(),
      state: stateName.trim(),
      district: district.trim(),
      landArea: Number(landArea) || 2,
      landUnit,
      cropType: cropType.trim(),
      income: Number(income) || 150000,
      hasKcc,
      aadhaarLinked,
    });
    Alert.alert('Saved', 'Farmer profile and scheme matching attributes updated!');
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Farmer Profile & Farm Data</Text>
        <Text style={styles.subtitle}>Configures tailored scheme matching and subsidy eligibility</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card Header */}
        <View style={styles.profileHero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>{name.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroName}>{name}</Text>
            <Text style={styles.heroPhone}>+91 {phone}</Text>
            <Text style={styles.heroLocation}>{district}, {stateName}</Text>
          </View>
          <TouchableOpacity
            style={styles.switchProfileBtn}
            onPress={() => navigation.navigate('SwitchProfile')}
          >
            <MaterialCommunityIcons name="account-switch" size={18} color={Colors.primaryLight} />
            <Text style={styles.switchProfileText}>Profiles</Text>
          </TouchableOpacity>
        </View>

        {/* Basic Fields */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Farmer Full Name *</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>State *</Text>
            <TextInput style={styles.input} value={stateName} onChangeText={setStateName} />
          </View>
          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>District / Locality *</Text>
            <TextInput style={styles.input} value={district} onChangeText={setDistrict} />
          </View>
        </View>

        {/* Land Size & Unit Converter */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionBoxTitle}>Landholding & Unit Converter</Text>
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.label}>Total Cultivated Land</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={landArea}
                onChangeText={setLandArea}
              />
            </View>
          </View>

          <Text style={[styles.label, { marginTop: 10 }]}>Select Regional Unit</Text>
          <View style={styles.unitRow}>
            {units.map((u) => {
              const isSelected = landUnit === u;
              return (
                <TouchableOpacity
                  key={u}
                  style={[styles.unitPill, isSelected && styles.unitPillActive]}
                  onPress={() => handleUnitChange(u)}
                >
                  <Text style={[styles.unitText, isSelected && styles.unitTextActive]}>
                    {u.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.convertedInfo}>
            Equals: {formatLandArea(convertLandArea(Number(landArea) || 0, landUnit, 'acre'), 'acre')} standard
          </Text>
        </View>

        {/* Crop & Income */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Primary Crop *</Text>
            <TextInput style={styles.input} value={cropType} onChangeText={setCropType} />
          </View>
          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>Annual Income (₹)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={income}
              onChangeText={setIncome}
            />
          </View>
        </View>

        {/* Scheme Qualification Checklist */}
        <Text style={styles.subHeading}>Scheme Qualification Attributes</Text>
        <TouchableOpacity
          style={styles.checkRow}
          activeOpacity={0.8}
          onPress={() => setHasKcc(!hasKcc)}
        >
          <MaterialCommunityIcons
            name={hasKcc ? 'checkbox-marked' : 'checkbox-blank-outline'}
            size={22}
            color={hasKcc ? Colors.primary : Colors.textMuted}
          />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.checkTitle}>Have Kisan Credit Card (KCC)</Text>
            <Text style={styles.checkSub}>Enables subsidized 4% crop loan interest</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.checkRow}
          activeOpacity={0.8}
          onPress={() => setAadhaarLinked(!aadhaarLinked)}
        >
          <MaterialCommunityIcons
            name={aadhaarLinked ? 'checkbox-marked' : 'checkbox-blank-outline'}
            size={22}
            color={aadhaarLinked ? Colors.primary : Colors.textMuted}
          />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.checkTitle}>Aadhaar Linked with Bank</Text>
            <Text style={styles.checkSub}>Required for PM-KISAN Direct Benefit Transfer (DBT)</Text>
          </View>
        </TouchableOpacity>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Update Profile & Match Schemes</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 50,
  },
  profileHero: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  heroName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  heroPhone: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  heroLocation: {
    fontSize: 12,
    color: Colors.primaryLight,
    marginTop: 1,
  },
  switchProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(22, 163, 74, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  switchProfileText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primaryLight,
  },
  inputGroup: {
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionBox: {
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  sectionBoxTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  unitRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  unitPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.surfaceLight,
  },
  unitPillActive: {
    backgroundColor: Colors.primary,
  },
  unitText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  unitTextActive: {
    color: '#ffffff',
  },
  convertedInfo: {
    fontSize: 12,
    color: Colors.primaryLight,
    fontStyle: 'italic',
  },
  subHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 6,
    marginBottom: 12,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
  },
  checkTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  checkSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
