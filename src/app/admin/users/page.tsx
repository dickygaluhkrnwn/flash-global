"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, User, Building, Truck, ShieldCheck, 
  Search, CheckCircle2, AlertCircle, Ban, 
  KeyRound, Save, Plus, Mail
} from "lucide-react";

// --- IMPORT FIREBASE CORE ---
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";

// --- INTERFACES ---
interface UserSystemData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "user" | "b2b_client" | "superadmin" | "admin_finance" | "admin_operational" | "admin_cs";
  isSuspended?: boolean;
  b2bLimit?: number;
  npwp?: string;
  contractStatus?: "Pending" | "Approved" | "Rejected";
}

interface DriverSystemData {
  id: string;
  name: string;
  phone: string;
  vehicleType: string;
  balance: number;
  isSuspended?: boolean;
  ktpVerified?: boolean;
  simVerified?: boolean;
}

export default function AdminUsersManagementPage() {
  const [activeTab, setActiveTab] = useState<"b2c" | "b2b" | "driver" | "staff">("b2c");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Core Data Lists
  const [systemUsers, setSystemSystemUsers] = useState<UserSystemData[]>([]);
  const [driverUsers, setDriverSystemUsers] = useState<DriverSystemData[]>([]);

  // State Form New Staff
  const [newStaff, setNewStaff] = useState({ name: "", email: "", role: "admin_cs" as UserSystemData["role"] });

  const loadAllUsersData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch seluruh users dari Firestore
      const usersSnap = await getDocs(collection(db, "users"));
      const usersList = usersSnap.docs.map(docObj => ({
        id: docObj.id,
        ...docObj.data()
      })) as UserSystemData[];
      setSystemSystemUsers(usersList);

      // 2. Fetch seluruh supir dari Firestore
      const driversSnap = await getDocs(collection(db, "driver_wallets"));
      const driversList = driversSnap.docs.map(docObj => ({
        id: docObj.id,
        ...docObj.data()
      })) as DriverSystemData[];
      setDriverSystemUsers(driversList);

    } catch (error) {
      console.error("Gagal menarik entitas data pengguna:", error);
      showToast("error", "Gagal memuat database pengguna.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllUsersData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  // HANDLER: Reset Password B2C / B2B via Firebase Email Link
  const handleResetPasswordEmail = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      showToast("success", `Link pemulihan kata sandi sukses dikirim ke: ${email}`);
    } catch (error) {
      console.error("Gagal kirim email reset:", error);
      showToast("error", "Gagal mengeksekusi perintah reset password.");
    }
  };

  // HANDLER: Toggle Suspend Status (B2C, B2B, Staff)
  const handleToggleUserSuspend = async (userId: string, currentStatus: boolean) => {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, { isSuspended: !currentStatus });
      showToast("success", `Status suspensi pengguna berhasil diperbarui.`);
      loadAllUsersData();
    } catch (error) {
      console.error("Gagal merubah status suspensi:", error);
      showToast("error", "Gagal memperbarui status suspensi.");
    }
  };

  // HANDLER: Toggle Suspend Status Driver
  const handleToggleDriverSuspend = async (driverId: string, currentStatus: boolean) => {
    try {
      const driverRef = doc(db, "driver_wallets", driverId);
      await updateDoc(driverRef, { isSuspended: !currentStatus });
      showToast("success", "Status operasional supir diperbarui.");
      loadAllUsersData();
    } catch (error) {
      console.error("Gagal suspensi supir:", error);
      showToast("error", "Gagal merubah status supir.");
    }
  };

  // HANDLER: Approval & Limit Piutang Korporat B2B
  const handleUpdateB2BContract = async (userId: string, status: "Approved" | "Rejected", limitVal: number) => {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        contractStatus: status,
        b2bLimit: limitVal,
        role: status === "Approved" ? "b2b_client" : "user"
      });
      showToast("success", `Berita acara kontrak B2B sukses diperbarui.`);
      loadAllUsersData();
    } catch (error) {
      console.error("B2B update error:", error);
      showToast("error", "Gagal memproses validasi berkas B2B.");
    }
  };

  // HANDLER: Registrasi Akun Staf Baru (Mockup Manifest Data Node)
  const handleCreateStaffNode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      // Simpan manifest data role baru ke firestore (pembuatan login auth real harus via Cloud Function / Admin SDK)
      const staffMockId = `STF-${Math.floor(1000 + Math.random() * 9000)}`;
      await setDoc(doc(db, "users", staffMockId), {
        name: newStaff.name,
        email: newStaff.email,
        role: newStaff.role,
        isSuspended: false,
        createdAt: serverTimestamp()
      });
      
      showToast("success", `Hak akses internal staf ${newStaff.name} berhasil didaftarkan.`);
      setNewStaff({ name: "", email: "", role: "admin_cs" });
      loadAllUsersData();
    } catch (error) {
      console.error("Failed create staff:", error);
      showToast("error", "Gagal menyimpan entitas staf baru.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Filter Logic berdasarkan Query input pencarian
  const b2cFiltered = systemUsers.filter(u => u.role === "user" && (u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.includes(searchQuery)));
  const b2bFiltered = systemUsers.filter(u => (u.role === "b2b_client" || u.npwp) && (u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.includes(searchQuery)));
  const driverFiltered = driverUsers.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.phone.includes(searchQuery));
  const staffFiltered = systemUsers.filter(u => ["superadmin", "admin_finance", "admin_operational", "admin_cs"].includes(u.role) && (u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.includes(searchQuery)));

  return (
    <div className="space-y-8 pb-10">
      
      {/* Toast Alert Canvas Block */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-10 right-10 z-50 p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-xl ${toast.type === 'success' ? 'bg-emerald-950 border-emerald-500 text-emerald-400' : 'bg-red-950 border-red-500 text-red-400'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Modul */}
      <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <Users className="w-6 h-6 text-[#7A171D]" /> Manajemen Pengguna & HR Node
          </h1>
          <p className="text-slate-400 text-sm mt-1">Pusat kendali hak akses keamanan, verifikasi data legal korporat, dan suspensi mitra kurir.</p>
        </div>
        
        <div className="relative w-full md:w-80 shrink-0">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder="Cari manifest nama/email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-11 pr-4 py-2.5 text-white outline-none text-xs font-semibold focus:border-[#7A171D]"
          />
        </div>
      </div>

      {/* SISTEM TABULASI PREMIUN NAVIGATION */}
      <div className="flex border-b border-slate-800 gap-2 overflow-x-auto pb-px">
        <TabButton id="b2c" icon={User} label="Klien Personal (B2C)" isActive={activeTab === "b2c"} onClick={() => { setActiveTab("b2c"); setSearchQuery(""); }} />
        <TabButton id="b2b" icon={Building} label="Klien Korporat (B2B)" isActive={activeTab === "b2b"} onClick={() => { setActiveTab("b2b"); setSearchQuery(""); }} />
        <TabButton id="driver" icon={Truck} label="Mitra Sopir" isActive={activeTab === "driver"} onClick={() => { setActiveTab("driver"); setSearchQuery(""); }} />
        <TabButton id="staff" icon={ShieldCheck} label="Manajemen Staf" isActive={activeTab === "staff"} onClick={() => { setActiveTab("staff"); setSearchQuery(""); }} />
      </div>

      {/* AREA WORKSPACE DYNAMIC SHEET */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500 font-bold animate-pulse text-sm">Menghubungkan Jalur Pengenal Manusia...</div>
        ) : (
          <div className="p-6">
            
            {/* 1. TAB SEGMEN KLIEN PERSONAL (B2C) */}
            {activeTab === "b2c" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-slate-400 uppercase font-bold tracking-wider border-b border-slate-800">
                      <th className="p-4 pl-6">Profil Klien</th>
                      <th className="p-4">Kontak Telefon</th>
                      <th className="p-4">Status Pengenal</th>
                      <th className="p-4 pr-6 text-right">Otoritas Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {b2cFiltered.map(u => (
                      <tr key={u.id} className="hover:bg-slate-900/30 transition-colors">
                        <td className="p-4 pl-6">
                          <p className="font-bold text-white text-sm">{u.name}</p>
                          <p className="text-slate-400 font-mono mt-0.5">{u.email}</p>
                        </td>
                        <td className="p-4 text-slate-300 font-mono font-medium">{u.phone || "-"}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded font-bold ${u.isSuspended ? 'bg-red-950/40 text-red-400 border border-red-900' : 'bg-emerald-950/40 text-emerald-400 border border-emerald-900'}`}>
                            {u.isSuspended ? "SUSPENDED" : "ACTIVE NODE"}
                          </span>
                        </td>
                        <td className="p-4 pr-6 flex justify-end gap-2">
                          <button onClick={() => handleResetPasswordEmail(u.email)} className="p-2 bg-slate-900 border border-slate-700 text-slate-300 rounded-lg hover:border-[#C5A059] hover:text-[#C5A059] transition-all" title="Kirim Link Reset Password">
                            <KeyRound className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleToggleUserSuspend(u.id, u.isSuspended || false)} className={`p-2 rounded-lg border transition-all ${u.isSuspended ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white' : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white'}`} title={u.isSuspended ? "Unban User" : "Suspend User"}>
                            <Ban className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 2. TAB SEGMEN KLIEN KORPORAT (B2B) */}
            {activeTab === "b2b" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-slate-400 uppercase font-bold tracking-wider border-b border-slate-800">
                      <th className="p-4 pl-6">Badan Perusahaan</th>
                      <th className="p-4">Legal Pajak (NPWP)</th>
                      <th className="p-4">Limit Invoice Piutang</th>
                      <th className="p-4">Status Kontrak</th>
                      <th className="p-4 pr-6 text-right">Aksi Konfirmasi berkas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {b2bFiltered.map(u => <B2BRowKey key={u.id} user={u} onUpdate={handleUpdateB2BContract} />)}
                  </tbody>
                </table>
              </div>
            )}

            {/* 3. TAB SEGMEN MITRA SOPIR (DRIVER) */}
            {activeTab === "driver" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-slate-400 uppercase font-bold tracking-wider border-b border-slate-800">
                      <th className="p-4 pl-6">Mitra Kurir</th>
                      <th className="p-4">Armada Kendaraan</th>
                      <th className="p-4">Saldo Wallet</th>
                      <th className="p-4">Status Jalan</th>
                      <th className="p-4 pr-6 text-right">Blokir Operasional</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {driverFiltered.map(d => (
                      <tr key={d.id} className="hover:bg-slate-900/30 transition-colors">
                        <td className="p-4 pl-6">
                          <p className="font-bold text-white text-sm">{d.name}</p>
                          <p className="text-slate-400 font-mono mt-0.5">{d.phone}</p>
                        </td>
                        <td className="p-4 text-slate-300 font-medium">{d.vehicleType}</td>
                        <td className="p-4 font-bold text-emerald-400">Rp {d.balance.toLocaleString('id-ID')}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded font-bold ${d.isSuspended ? 'bg-red-950/40 text-red-400 border border-red-900' : 'bg-blue-950/40 text-blue-400 border border-blue-900'}`}>
                            {d.isSuspended ? "SUSPENDED" : "READY DISPATCH"}
                          </span>
                        </td>
                        <td className="p-4 pr-6 flex justify-end">
                          <button onClick={() => handleToggleDriverSuspend(d.id, d.isSuspended || false)} className={`p-2 rounded-lg border transition-all ${d.isSuspended ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white' : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white'}`}>
                            <Ban className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 4. TAB SEGMEN MANAJEMEN STAF INTERNAL */}
            {activeTab === "staff" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Kiri: Form Register Staf */}
                <div className="lg:col-span-4 bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2"><Plus className="w-4 h-4 text-[#7A171D]"/> Daftarkan Akun Staf</h3>
                  <form onSubmit={handleCreateStaffNode} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 uppercase">Nama Staf</label>
                      <input type="text" required value={newStaff.name} onChange={(e) => setNewStaff({...newStaff, name: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-xs font-semibold outline-none focus:border-[#7A171D]" placeholder="Nama admin..." />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 uppercase">Email Login</label>
                      <input type="email" required value={newStaff.email} onChange={(e) => setNewStaff({...newStaff, email: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-xs font-semibold outline-none focus:border-[#7A171D]" placeholder="staf@flashglobal.com" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 uppercase">Otoritas Role</label>
                      <select value={newStaff.role} onChange={(e) => setNewStaff({...newStaff, role: e.target.value as UserSystemData["role"]})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-xs font-semibold outline-none focus:border-[#7A171D]">
                        <option value="admin_cs">Customer Service (CS)</option>
                        <option value="admin_operational">Operational Admin</option>
                        <option value="admin_finance">Finance Admin</option>
                        <option value="superadmin">Super Admin</option>
                      </select>
                    </div>
                    <button type="submit" disabled={isProcessing} className="w-full bg-gradient-to-r from-[#7A171D] to-[#5A0E13] text-white font-bold py-3 rounded-xl text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                      <Save className="w-3.5 h-3.5" /> {isProcessing ? "Menyimpan..." : "Otorisasikan Staf"}
                    </button>
                  </form>
                </div>

                {/* Kanan: List Staf Berjalan */}
                <div className="lg:col-span-8 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-slate-400 uppercase font-bold tracking-wider border-b border-slate-800">
                        <th className="p-4 pl-4">Nama Personel</th>
                        <th className="p-4">Hak Jabatan</th>
                        <th className="p-4 pr-4 text-right">Tindakan Keamanan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {staffFiltered.map(s => (
                        <tr key={s.id} className="hover:bg-slate-900/30 transition-colors">
                          <td className="p-4 pl-4">
                            <p className="font-bold text-white text-sm">{s.name}</p>
                            <p className="text-slate-400 font-mono mt-0.5 flex items-center gap-1"><Mail className="w-3 h-3"/> {s.email}</p>
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono font-bold uppercase tracking-wider text-[10px]">
                              {s.role}
                            </span>
                          </td>
                          <td className="p-4 pr-4 flex justify-end">
                            <button onClick={() => handleToggleUserSuspend(s.id, s.isSuspended || false)} className={`p-2 rounded-lg border transition-all ${s.isSuspended ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white' : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white'}`}>
                              <Ban className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            )}

          </div>
        )}
      </div>

    </div>
  );
}

// Sub-komponen helper tombol tabulasi rute
function TabButton({ icon: Icon, label, isActive, onClick }: { id: string; icon: React.ElementType; label: string; isActive: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-5 py-3.5 font-bold text-xs transition-all relative outline-none shrink-0 ${isActive ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}>
      <Icon className={`w-4 h-4 ${isActive ? 'text-[#7A171D]' : 'text-slate-500'}`} /> {label}
      {isActive && <motion.div layoutId="activeTabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7A171D]" />}
    </button>
  );
}

// Sub-komponen baris data B2B khusus penanganan limit piutang dinamis
function B2BRowKey({ user, onUpdate }: { user: UserSystemData; onUpdate: (id: string, status: "Approved" | "Rejected", limitVal: number) => void }) {
  const [localLimit, setLocalLimit] = useState<number | "">(user.b2bLimit || 0);

  return (
    <tr className="hover:bg-slate-900/30 transition-colors">
      <td className="p-4 pl-6">
        <p className="font-bold text-white text-sm">{user.name}</p>
        <p className="text-slate-400 font-mono mt-0.5">{user.email}</p>
      </td>
      <td className="p-4 font-mono font-bold text-slate-300">{user.npwp || "Belum Input"}</td>
      <td className="p-4">
        <div className="relative w-28">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 font-bold">Rp</span>
          <input 
            type="number" 
            value={localLimit}
            onChange={(e) => setLocalLimit(e.target.value === "" ? "" : Number(e.target.value))}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-7 pr-2 py-1 text-white outline-none font-bold text-right"
          />
        </div>
      </td>
      <td className="p-4">
        <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
          user.contractStatus === "Approved" ? "bg-emerald-950/40 text-emerald-400 border border-emerald-900" :
          user.contractStatus === "Rejected" ? "bg-red-950/40 text-red-400 border border-red-900" :
          "bg-amber-950/40 text-amber-400 border border-amber-900"
        }`}>
          {user.contractStatus || "Draft Request"}
        </span>
      </td>
      <td className="p-4 pr-6 flex justify-end gap-1.5 pt-5">
        <button onClick={() => onUpdate(user.id, "Approved", Number(localLimit) || 0)} className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-md hover:bg-emerald-50 hover:text-white transition-all">
          Approve
        </button>
        <button onClick={() => onUpdate(user.id, "Rejected", 0)} className="p-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-md hover:bg-red-50 hover:text-white transition-all">
          Reject
        </button>
      </td>
    </tr>
  );
}