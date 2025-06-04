import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TextInput, Button, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { StationList } from '@/models/StationList';
import FontAwesome from '@expo/vector-icons/FontAwesome'; // For icons

export default function MyListsScreen() {
  const {
    stationLists,
    isLoadingStationLists,
    fetchStationLists,
    createStationList,
    deleteStationList,
    updateStationList,
  } = useAuth();
  const router = useRouter();

  const [newListName, setNewListName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingList, setEditingList] = useState<StationList | null>(null);
  const [updatedListName, setUpdatedListName] = useState('');

  useEffect(() => {
    fetchStationLists(); // Fetch initially and on focus if desired (not implemented here)
  }, []);

  const handleCreateList = async () => {
    if (!newListName.trim()) {
      Alert.alert('Error', 'List name cannot be empty.');
      return;
    }
    setIsCreating(true);
    const newList = await createStationList(newListName.trim());
    if (newList) {
      setNewListName('');
      Alert.alert('Success', `List "${newList.name}" created.`);
    }
    setIsCreating(false);
  };

  const handleDeleteList = (listId: string, listName: string) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete the list "${listName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteStationList(listId) },
      ]
    );
  };

  const handleStartEdit = (list: StationList) => {
    setEditingList(list);
    setUpdatedListName(list.name);
  };

  const handleConfirmEdit = async () => {
    if (!editingList || !updatedListName.trim()) return;
    await updateStationList(editingList.id, updatedListName.trim());
    setEditingList(null);
    setUpdatedListName('');
  };

  const renderItem = ({ item }: { item: StationList }) => (
    <View style={styles.listItem}>
      {editingList?.id === item.id ? (
        <View style={styles.editContainer}>
          <TextInput
            style={styles.editInput}
            value={updatedListName}
            onChangeText={setUpdatedListName}
            autoFocus
          />
          <Button title="Save" onPress={handleConfirmEdit} />
          <TouchableOpacity onPress={() => setEditingList(null)} style={styles.iconButton}><FontAwesome name="times" size={20} color="gray" /></TouchableOpacity>
        </View>
      ) : (
        <>
          <TouchableOpacity
            style={styles.listItemTextContainer}
            onPress={() => router.push(`/listDetail/${item.id}`)} // Navigate to detail screen
          >
            <Text style={styles.listItemName}>{item.name}</Text>
            <Text style={styles.listItemCount}>{item.stationIds.length} station(s)</Text>
          </TouchableOpacity>
          <View style={styles.listItemActions}>
            <TouchableOpacity onPress={() => handleStartEdit(item)} style={styles.iconButton}><FontAwesome name="pencil" size={20} color="blue" /></TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeleteList(item.id, item.name)} style={styles.iconButton}><FontAwesome name="trash" size={20} color="red" /></TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );

  if (isLoadingStationLists && stationLists.length === 0 && !isCreating) {
    return <View style={styles.centered}><ActivityIndicator size="large" /><Text>Loading lists...</Text></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Custom Lists</Text>
      <View style={styles.createListContainer}>
        <TextInput
          style={styles.input}
          placeholder="New list name"
          value={newListName}
          onChangeText={setNewListName}
        />
        <Button title={isCreating ? "Creating..." : "Create List"} onPress={handleCreateList} disabled={isCreating} />
      </View>

      {stationLists.length === 0 && !isLoadingStationLists && (
         <Text style={styles.emptyMessage}>No lists created yet. Add one above!</Text>
      )}

      <FlatList
        data={stationLists}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        extraData={editingList} // Ensure re-render when editingList changes
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  createListContainer: { flexDirection: 'row', marginBottom: 20, alignItems: 'center' },
  input: { flex: 1, borderColor: 'gray', borderWidth: 1, padding: 10, marginRight: 10, borderRadius: 5 },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal:10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: 'white',
    borderRadius: 5,
    marginBottom: 5,
   },
  listItemTextContainer: { flex: 1 },
  listItemName: { fontSize: 18, fontWeight: '500' },
  listItemCount: { fontSize: 12, color: 'gray' },
  listItemActions: { flexDirection: 'row' },
  iconButton: { paddingHorizontal: 10 },
  emptyMessage: { textAlign: 'center', marginTop: 20, fontSize: 16, color: 'gray'},
  editContainer: { flexDirection: 'row', alignItems: 'center', flex: 1},
  editInput: { flex: 1, borderColor: 'skyblue', borderWidth: 1, padding: 8, marginRight: 10, borderRadius: 5 },
});
