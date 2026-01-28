import { auth, db } from "../../firebase";
import { collection, deleteDoc, doc, getDocs, limit, query, writeBatch } from "firebase/firestore";

async function deleteCollectionInBatches(colRef: ReturnType<typeof collection>, batchSize = 450) {
  while (true) {
    const snap = await getDocs(query(colRef, limit(batchSize)));
    if (snap.empty) break;

    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

export async function deleteManage(manageId: string) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("로그인이 필요합니다.");

  await deleteCollectionInBatches(collection(db, "users", uid, "manages", manageId, "tasks"));
  await deleteCollectionInBatches(collection(db, "users", uid, "manages", manageId, "sections"));
  await deleteDoc(doc(db, "users", uid, "manages", manageId));
}
