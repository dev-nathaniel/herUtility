import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { styles } from './sites.styles';
import Electricity from '@/assets/icons/Electricity';
import Fire from '@/assets/icons/Fire';
import LiquidDrop from '@/assets/icons/LiquidDrop';

const UtilityIcon = ({ fuel }: { fuel: string }) => {
    switch (fuel) {
        case "Electricity": return <View style={{marginRight: 8}}><Electricity width={16} height={16} /></View>;
        case "Gas": return <View style={{marginRight: 8}}><Fire width={16} height={16} /></View>;
        case "Water": return <View style={{marginRight: 8}}><LiquidDrop width={16} height={16} /></View>;
        case "Telecoms": return <Ionicons name="call" size={16} color="#a855f7" style={{ marginRight: 8 }} />;
        default: return <View style={{marginRight: 8}}><Electricity width={16} height={16} /></View>;
    }
};

const MeterIcon = ({ fuel }: { fuel: string }) => {
    const config: any = {
        Electricity: { bg: "#fef08a", text: "#ca8a04" },
        Gas: { bg: "#fed7aa", text: "#ea580c" },
        Water: { bg: "#bfdbfe", text: "#2563eb" },
        Telecoms: { bg: "#e9d5ff", text: "#9333ea" },
    };
    const { bg, text } = config[fuel] || config.Electricity;

    const renderIcon = () => {
        switch (fuel) {
            case "Electricity": return <Electricity width={20} height={20} />;
            case "Gas": return <Fire width={20} height={20} />;
            case "Water": return <LiquidDrop width={20} height={20} />;
            case "Telecoms": return <Ionicons name="call" size={20} color={text} />;
            default: return <Electricity width={20} height={20} />;
        }
    };

    return (
        <View style={[styles.iconContainer, { backgroundColor: bg }]}>
            {renderIcon()}
        </View>
    );
};

const ContractRow = ({ contract, onViewDetails }: any) => {
    const getDaysRemaining = (endDateStr?: string) => {
        if (!endDateStr) return { text: "No contract end date", color: "#9ca3af" };
        const end = new Date(endDateStr);
        if (isNaN(end.getTime())) return { text: "N/A", color: "#9ca3af" };
        
        const now = new Date();
        const diffTime = end.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return { text: `${Math.abs(diffDays)} days overdue`, color: "#ef4444" };
        if (diffDays === 0) return { text: "Expires today", color: "#ef4444" };
        
        let color = "#22c55e"; // green
        if (diffDays <= 15 && diffDays > 7) return { text: `${diffDays} days remaining`, color: "#d97706" }; // gold
        if (diffDays <= 7) return { text: `${diffDays} days remaining`, color: "#ef4444" }; // red
        
        return { text: `${diffDays} days remaining`, color };
    };

    const daysRemaining = getDaysRemaining(contract.end);

    return (
        <TouchableOpacity
            style={styles.contractRow}
            onPress={() => onViewDetails(contract)}
        >
            <View style={styles.contractLeft}>
                <MeterIcon fuel={contract.fuel} />
                <View>
                    <Text style={styles.contractFuel}>{contract.fuel}</Text>
                    <Text style={[styles.contractDays, { color: daysRemaining.color }]}>
                        {daysRemaining.text}
                    </Text>
                </View>
            </View>

            <View style={styles.contractRight}>
                <Ionicons name="arrow-forward" size={18} color="#9ca3af" />
            </View>
        </TouchableOpacity>
    );
};

export const BusinessCard = ({
    business,
    contracts,
    onAddMeter,
    onViewDetails,
}: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const fuels = Array.from(new Set(contracts.map((c: any) => c.fuel)));

    return (
        <View style={styles.businessCard}>
            <TouchableOpacity
                style={styles.businessHeader}
                onPress={() => setIsOpen(!isOpen)}
                activeOpacity={0.7}
            >
                <View style={styles.businessHeaderTop}>
                    <Text style={styles.businessName} numberOfLines={1} ellipsizeMode="tail">
                        {business.name}
                    </Text>
                    <Ionicons
                        name={isOpen ? "chevron-up" : "chevron-down"}
                        size={18}
                        color="#0f172a"
                    />
                </View>
                <Text style={styles.businessAddressText} numberOfLines={1}>
                    {business.postcode || business.address}
                </Text>
                
                <View style={styles.businessHeaderBottom}>
                    <View style={styles.businessIcons}>
                        {fuels.map((fuel: any) => (
                            <UtilityIcon key={fuel} fuel={fuel} />
                        ))}
                    </View>
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={(e) => {
                            e.stopPropagation();
                            onAddMeter(business.id, business.name);
                        }}
                    >
                        <Ionicons name="add-circle-outline" size={24} color="#0f172a" />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>

            {isOpen && (
                <View style={styles.contractsContainer}>
                    {contracts.length > 0 ? (
                        contracts.map((contract: any) => (
                            <ContractRow
                                key={contract.id}
                                contract={contract}
                                onViewDetails={onViewDetails}
                            />
                        ))
                    ) : (
                        <View style={styles.emptyContracts}>
                            <Text style={styles.emptyContractsText}>
                                No services connected.
                            </Text>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
};
